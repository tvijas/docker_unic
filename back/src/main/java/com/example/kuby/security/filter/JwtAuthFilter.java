package com.example.kuby.security.filter;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.example.kuby.foruser.UserEntity;
import com.example.kuby.foruser.UserRepo;
import com.example.kuby.security.models.enums.TokenType;
import com.example.kuby.security.ratelimiter.GlobalRateLimit;
import com.example.kuby.security.service.JwtService;
import com.example.kuby.security.service.UserAuthenticationProvider;
import com.example.kuby.security.util.parsers.AuthHeaderParser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

import static com.example.kuby.security.util.parsers.AuthHeaderParser.getIdFromClaimsByKey;
import static com.example.kuby.security.util.parsers.AuthHeaderParser.getProviderFromClaims;


@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final UserAuthenticationProvider userAuthenticationProvider;
    private final UserRepo userRepo;
    private final GlobalRateLimit globalRateLimit;
    @Value("${global.rate.limit.turn.on}")
    private boolean turnOnRateLimit;
    private final JwtService jwtService;
    private static final Set<String> permittedUrls = Set.of(
            "/api/user/**",
            "/api/user/verify/local"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        if (turnOnRateLimit) {
            if (!globalRateLimit.allowRequest(getClientIpAddress(request), System.currentTimeMillis())) {
                response.setStatus(429);
                return;
            }
        }

        String requestPath = request.getServletPath();
        System.out.println("Request path: " + requestPath);

        if (isPermittedUrl(requestPath)) {
            System.out.println("Users request was filtrated");
            filterChain.doFilter(request, response);
            return;
        }

        String token = AuthHeaderParser.recoverToken(request);
        if (token == null) {
            response.setStatus(401);
            return;
        }

        DecodedJWT decodedAccessToken = userAuthenticationProvider.validateToken(token, TokenType.ACCESS);

        if (decodedAccessToken == null) {
            response.setStatus(401);
            return;
        }

        boolean isTokenClaimValid = jwtService.isTokenClaimValid(
                getIdFromClaimsByKey(decodedAccessToken.getClaims(), "jwtId").toString(),
                decodedAccessToken, response
        );

        if (!isTokenClaimValid) {
            response.setStatus(420);
            return;
        }

        Optional<UserEntity> optionalUser = userRepo.findByEmailAndProvider(
                decodedAccessToken.getSubject(),
                getProviderFromClaims(decodedAccessToken.getClaims())
        );

        if (optionalUser.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            filterChain.doFilter(request, response);
            return;
        }
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(optionalUser.get(), null, optionalUser.get().getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty()) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }

    public static boolean isPermittedUrl(String url) {
        return permittedUrls.stream().anyMatch(pattern -> matches(pattern, url));
    }

    private static boolean matches(String pattern, String url) {
        String regex = pattern
                .replace("**", ".*")
                .replace("*", "[^/]*")
                .replace("/", "\\/");
        return Pattern.compile("^" + regex + "$").matcher(url).matches();
    }
}

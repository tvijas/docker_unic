import React, { useState } from 'react';
import baseRequest from "../network/baseRequest";
import { Link } from 'react-router-dom';

const ResetPassword = () =>{
    const [formData, setFormData] = useState({
        email: '',
        password: ''
      });
      const [errors, setErrors] = useState({});
    
      const validateForm = () => {
        const newErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_-])[A-Za-z\d@$!%*#?&_-]+$/;
    
        if (!emailRegex.test(formData.email)) {
          newErrors.email = 'Inccorect email format';
        }
        if (formData.email.length > 40) {
          newErrors.email = 'Email is too big (max size is: 40 symbols)';
        }
        if (formData.password.length < 9 || formData.password.length > 30) {
          newErrors.password = 'Password must contain from 9 to 30 symbols';
        }
        if (!passwordRegex.test(formData.password)) {
          newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character';
        }
    
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
      };
    
      const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
      };
    
      const handleSubmit = async (e) => {
        e.preventDefault();
        if (validateForm()) {
          try {
            const response = await baseRequest.post('/api/user/change-password', formData, {
              headers: {
                'Content-Type': 'application/json'
              }
            });
            if (response.status === 201) {
              console.log('Success');
              // Здесь можно добавить перенаправление на страницу подтверждения или логина
            }
          } catch (error) {
            if (error.response && error.response.data) {
              setErrors(error.response.data);
            } else {
              console.error('Change password error:', error);
            }
          }
        }
      };
    
      return (
        <div>
          <h2>Reset Password</h2>
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              {errors.email && <p>{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="password">Password:</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              {errors.password && <p>{errors.password}</p>}
            </div>
            <button type="submit">Reset password</button>
          </form>
          <p>You have an account? <Link to="/login">Login</Link></p>
          <p>You do not have account? <Link to="/register">Signup</Link></p>
        </div>
      );
};

export default ResetPassword;
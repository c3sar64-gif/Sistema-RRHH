import React, { useState } from 'react';

interface InputWithIconProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode; // Optional icon element
  placeholder?: string;
  required?: boolean;
}

const InputWithIcon: React.FC<InputWithIconProps> = ({
  id,
  label,
  type,
  value,
  onChange,
  icon,
  placeholder,
  required = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          type={inputType}
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
        />
        {type === 'password' && (
          <span className="password-toggle" onClick={togglePasswordVisibility}>
            {showPassword ? (
              // Eye-slash icon (hide password)
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-eye-off">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.25 18.25 0 0 1 4.7-5.91M18.79 11.29A10.07 10.07 0 0 1 23 12c0 7-4 11-11 11a18.25 18.25 0 0 1-5.91-4.7L18.79 11.29zM12 6.64a4 4 0 0 1 0 7.72"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            ) : (
              // Eye icon (show password)
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-eye">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export default InputWithIcon;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';

export const useRegister = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isUsernameValid = username.trim().length > 3 && /^[a-zA-Z0-9_-]+$/.test(username);

  const getPasswordStrength = () => {
    if (!password) return { level: 0, text: 'WEAK', class: 'text-on-surface-variant' };
    const len = password.length;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    let score = 0;
    if (len >= 6) score++;
    if (len >= 10) score++;
    if (hasUpper && hasLower && hasNumber) score++;
    if (len >= 12 && hasSpecial) score++;

    if (score <= 1) return { level: 1, text: 'CRITICAL', class: 'text-error', barColor: 'bg-error' };
    if (score === 2) return { level: 2, text: 'MODERATE', class: 'text-warning', barColor: 'bg-warning' };
    if (score === 3) return { level: 3, text: 'ACCEPTABLE', class: 'text-info', barColor: 'bg-info' };
    return { level: 4, text: 'SECURE', class: 'text-success', barColor: 'bg-success' };
  };

  const strength = getPasswordStrength();
  const isMatch = confirmPassword.length > 0 && password === confirmPassword;
  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUsernameValid || isMismatch) return;

    setIsLoading(true);
    try {
      await register({ username: username.trim(), email, password });
      setIsLoading(false);
      navigate('/authorization');
    } catch {
      setIsLoading(false);
    }
  };

  return {
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    isLoading,
    isUsernameValid,
    strength,
    isMatch,
    isMismatch,
    handleSubmit,
  };
};

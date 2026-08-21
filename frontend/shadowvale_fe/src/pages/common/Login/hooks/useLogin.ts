import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';

export const useLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authError, setAuthError] = useState('');

  const validateIdentifier = (val: string) => {
    if (!val.trim()) {
      setIdentifierError('Valid operator ID required.');
      return false;
    }
    setIdentifierError('');
    return true;
  };

  const validatePassword = (val: string) => {
    if (!val) {
      setPasswordError('Passkey cannot be empty.');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleIdentifierChange = (val: string) => {
    setIdentifier(val);
    if (identifierError) validateIdentifier(val);
    if (authError) setAuthError('');
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (passwordError) validatePassword(val);
    if (authError) setAuthError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isIdValid = validateIdentifier(identifier);
    const isPassValid = validatePassword(password);

    if (!isIdValid || !isPassValid) return;

    setAuthError('');
    setIsLoading(true);

    try {
      await login({ callsign: identifier.trim(), password, rememberMe });
      setTimeout(() => {
        setIsLoading(false);
        navigate('/authorization');
      }, 1200);
    } catch (err: any) {
      setIsLoading(false);
      setAuthError(err.message || 'Authentication failed. Access denied.');
    }
  };

  return {
    identifier,
    setIdentifier: handleIdentifierChange,
    password,
    setPassword: handlePasswordChange,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    isLoading,
    identifierError,
    passwordError,
    authError,
    handleSubmit,
  };
};

import { useState } from 'react';
import { authService } from '../../../../services/auth/authService';

export const useResetPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Comms uplink is required.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await authService.resetPassword({ email: email.trim() });
      setIsLoading(false);
      setIsSuccess(true);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to send reset link. Try again.');
    }
  };

  return {
    email,
    setEmail,
    isLoading,
    isSuccess,
    error,
    handleSubmit,
  };
};

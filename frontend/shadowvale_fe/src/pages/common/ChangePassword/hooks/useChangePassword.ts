import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const useChangePassword = () => {
  const navigate = useNavigate();

  const [currentCipher, setCurrentCipher] = useState('');
  const [newCipher, setNewCipher] = useState('');
  const [confirmCipher, setConfirmCipher] = useState('');

  const [showCurrentCipher, setShowCurrentCipher] = useState(false);
  const [showNewCipher, setShowNewCipher] = useState(false);
  const [showConfirmCipher, setShowConfirmCipher] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Requirements checks
  const hasMinLength = newCipher.length >= 12;
  const hasAlphanumeric = /[a-zA-Z]/.test(newCipher) && /[0-9]/.test(newCipher);
  const hasSpecial = /[^a-zA-Z0-9]/.test(newCipher);

  // Strength calculation
  const getStrength = (val: string) => {
    if (!val) {
      return { score: 0, label: 'Awaiting Input', textClass: 'text-on-surface-variant' };
    }

    let score = 0;
    if (val.length > 0) score++;
    if (val.length >= 8) score++;
    if (val.length >= 12 && /[a-zA-Z]/.test(val) && /[0-9]/.test(val)) score++;
    if (val.length >= 12 && /[^a-zA-Z0-9]/.test(val)) score++;

    if (score === 1) return { score: 1, label: 'Weak', textClass: 'text-error', barColor: 'bg-error' };
    if (score === 2) return { score: 2, label: 'Moderate', textClass: 'text-warning', barColor: 'bg-warning' };
    if (score === 3) return { score: 3, label: 'Strong', textClass: 'text-info', barColor: 'bg-info' };
    if (score === 4) return { score: 4, label: 'Optimal', textClass: 'text-success', barColor: 'bg-success' };

    return { score: 0, label: 'Awaiting Input', textClass: 'text-on-surface-variant' };
  };

  const strength = getStrength(newCipher);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentCipher) {
      setErrorMessage('Current access cipher is required.');
      return;
    }

    if (!newCipher || !confirmCipher) {
      setErrorMessage('Please populate all cipher fields.');
      return;
    }

    if (newCipher !== confirmCipher) {
      setErrorMessage('New cipher confirmation does not match.');
      return;
    }

    if (!hasMinLength || !hasAlphanumeric || !hasSpecial) {
      setErrorMessage('New cipher does not meet protocol security requirements.');
      return;
    }

    setIsLoading(true);

    // Simulate API update call
    setTimeout(() => {
      setIsLoading(false);
      setShowToast(true);

      setTimeout(() => {
        setShowToast(false);
        navigate('/authorization');
      }, 3000);
    }, 1000);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return {
    currentCipher,
    setCurrentCipher,
    newCipher,
    setNewCipher,
    confirmCipher,
    setConfirmCipher,
    showCurrentCipher,
    setShowCurrentCipher,
    showNewCipher,
    setShowNewCipher,
    showConfirmCipher,
    setShowConfirmCipher,
    isLoading,
    errorMessage,
    showToast,
    setShowToast,
    hasMinLength,
    hasAlphanumeric,
    hasSpecial,
    strength,
    handleSubmit,
    handleCancel,
  };
};

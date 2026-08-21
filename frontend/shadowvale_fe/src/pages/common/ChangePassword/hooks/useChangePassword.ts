import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const useChangePassword = () => {
  const navigate = useNavigate();

  const [newCipher, setNewCipher] = useState('');
  const [confirmCipher, setConfirmCipher] = useState('');
  const [showNewCipher, setShowNewCipher] = useState(false);
  const [showConfirmCipher, setShowConfirmCipher] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const getStrength = (val: string) => {
    if (!val) return { score: 0, label: 'Awaiting Input', colorClass: 'text-on-surface-variant' };
    let score = 0;
    if (val.length > 7) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    if (score <= 2) return { score, label: 'Vulnerable', colorClass: 'text-error', barColor: 'bg-error border-error' };
    if (score === 3) return { score, label: 'Acceptable', colorClass: 'text-warning', barColor: 'bg-warning border-warning' };
    return { score: 4, label: 'Optimal Integrity', colorClass: 'text-success', barColor: 'bg-success border-success' };
  };

  const strength = getStrength(newCipher);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!newCipher || !confirmCipher) {
      setErrorMessage('Parameters incomplete. Populate all fields.');
      return;
    }

    if (newCipher !== confirmCipher) {
      setErrorMessage('Cipher mismatch. Input sequences do not align.');
      return;
    }

    if (strength.score < 3) {
      setErrorMessage('Structural integrity insufficient. Enhance complexity.');
      return;
    }

    setIsLoading(true);

    // Simulate API cipher sync call
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage('Cipher updated successfully. Authenticating operative sequence...');
      setTimeout(() => {
        navigate('/authorization');
      }, 1500);
    }, 1000);
  };

  return {
    newCipher,
    setNewCipher,
    confirmCipher,
    setConfirmCipher,
    showNewCipher,
    setShowNewCipher,
    showConfirmCipher,
    setShowConfirmCipher,
    isLoading,
    errorMessage,
    successMessage,
    strength,
    handleSubmit,
  };
};

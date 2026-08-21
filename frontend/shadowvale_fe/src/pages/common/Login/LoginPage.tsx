import React, { useState } from 'react';
import { LoginForm } from './components/LoginForm';
import { PasswordResetModal } from '../../../components/modal/PasswordResetModal';

export const LoginPage: React.FC = () => {
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  return (
    <>
      <LoginForm onForgotPassword={() => setIsResetModalOpen(true)} />
      <PasswordResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
      />
    </>
  );
};

export default LoginPage;

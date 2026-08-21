import React from 'react';
import { Link } from 'react-router-dom';
import { useRegister } from '../hooks/useRegister';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';

export const RegistrationForm: React.FC = () => {
  const {
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
  } = useRegister();

  return (
    <div className="w-full max-w-[420px] relative z-10">
      <div className="text-center mb-stack-lg">
        <h1 className="font-display-lg text-display-lg text-primary tracking-tight brand-glow flex items-center justify-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: '36px', fontVariationSettings: "'FILL' 1" }}>
            terminal
          </span>
          ShadowVale
        </h1>
        <p className="font-label-caps text-label-caps text-on-surface-variant mt-2 tracking-widest uppercase opacity-70">
          Operative Initialization
        </p>
      </div>

      <div className="bg-surface border border-border-subtle rounded-lg shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-primary"></div>

        {isLoading && (
          <div className="absolute inset-0 bg-surface/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center">
            <span className="material-symbols-outlined text-primary text-4xl loading-spinner mb-3">
              memory
            </span>
            <p className="font-data-mono text-sm text-primary font-bold uppercase tracking-wider mb-1">
              CREATING OPERATIVE RECORD...
            </p>
            <p className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest">
              GENERATING CRYPTOGRAPHIC KEYPAIR
            </p>
          </div>
        )}

        <div className="p-stack-lg">
          <form className="flex flex-col gap-stack-md" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end mb-0.5">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="username">
                  Callsign (Username)
                </label>
                {isUsernameValid && (
                  <span className="font-label-caps text-[10px] text-success flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span> Available
                  </span>
                )}
              </div>
              <Input
                id="username"
                icon="badge"
                type="text"
                required
                spellCheck={false}
                placeholder="Enter operative callsign"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                helperText="Alphanumeric characters only. No spaces."
              />
            </div>

            <Input
              id="email"
              label="Comms Uplink (Email)"
              icon="mail"
              type="email"
              required
              placeholder="operative@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="flex flex-col gap-1">
              <Input
                id="password"
                label="Access Cipher (Password)"
                icon="key"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-on-surface-variant hover:text-primary transition-colors focus:outline-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                }
              />

              <div className="mt-2">
                <div className="flex gap-1 h-1.5 w-full">
                  <div className={`flex-1 rounded-full transition-colors duration-300 ${strength.level >= 1 ? strength.barColor : 'bg-surface-variant'}`}></div>
                  <div className={`flex-1 rounded-full transition-colors duration-300 ${strength.level >= 2 ? strength.barColor : 'bg-surface-variant'}`}></div>
                  <div className={`flex-1 rounded-full transition-colors duration-300 ${strength.level >= 3 ? strength.barColor : 'bg-surface-variant'}`}></div>
                  <div className={`flex-1 rounded-full transition-colors duration-300 ${strength.level >= 4 ? strength.barColor : 'bg-surface-variant'}`}></div>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-label-caps text-[10px] text-on-surface-variant">
                    Min. 12 chars, mixed case, symbols
                  </span>
                  <span className={`font-label-caps text-[10px] uppercase ${strength.class}`}>
                    {strength.text}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Input
                id="confirm_password"
                label="Verify Cipher"
                icon="password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={isMismatch ? 'Ciphers do not match.' : undefined}
                rightElement={
                  isMatch ? (
                    <span className="material-symbols-outlined text-success text-lg">check</span>
                  ) : undefined
                }
              />
            </div>

            <div className="bg-surface-container border border-border-subtle rounded-DEFAULT p-3 mt-2 flex items-start gap-2">
              <span className="material-symbols-outlined text-info mt-0.5 text-base">info</span>
              <p className="font-data-mono text-[11px] text-on-surface-variant leading-tight">
                Registration locked to <span className="text-on-surface font-bold">Standard Operative</span> tier. Elevated access requests must be routed via Command Center post-initialization.
              </p>
            </div>

            <div className="mt-stack-md pt-stack-sm border-t border-border-subtle flex flex-col gap-stack-sm">
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={isMismatch || !isUsernameValid}
                size="lg"
                className="w-full"
              >
                Initialize Profile
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Button>

              <Link
                to="/login"
                className="w-full text-center py-2 text-on-surface-variant hover:text-primary font-data-mono text-[12px] transition-colors flex justify-center items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Abort sequence (Return to Login)
              </Link>
            </div>
          </form>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 px-2 opacity-50">
        <span className="font-data-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
          SYS.ID: SV-REG-09X
        </span>
        <span className="font-data-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
          SEC: CL-2
        </span>
      </div>
    </div>
  );
};

import React from 'react';

export const UserProfileHeader: React.FC = () => {
  return (
    <div className="bg-surface border border-outline-variant rounded-lg p-stack-md flex flex-col md:flex-row items-start md:items-center gap-stack-md relative overflow-hidden">
      {/* Tech background accent */}
      <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-surface-bright/20 to-transparent pointer-events-none border-l border-outline-variant/10"></div>
      
      <div className="relative">
        <img 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCdO_U_T50TugcYpnORYk-WZhvAHzzojFUdxJECMkJrTbKKQ7Vec2Y_u9xqxbzrwOEMhhlj1bA7y7jLssN-qR_jxZbjx4vOwwl50adD-iXa3YLyscH28zs6IIeCF61Ss-0mtOt-BMBVApL6JhHHneZZ0iOjqboSXDDI23HyqfMLzonOaCAT-K_wlvUG8S9A4JRrlvxKSEinUkrRbZyVM62M0quB2JF7YD7cVufiqKg0QRGHgp5zxRSKYg" 
          alt="Operative Avatar" 
          className="w-24 h-24 rounded border-2 border-primary/30 object-cover bg-surface-container-lowest"
        />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-surface"></div>
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-stack-sm mb-1">
          <h2 className="font-headline-md text-headline-md text-on-surface m-0">Kaelen Vance</h2>
          <span className="bg-success/10 text-success border border-success/30 font-label-caps text-label-caps px-2 py-0.5 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-success rounded-full block"></span>
            ACTIVE
          </span>
        </div>
        <p className="font-data-mono text-data-mono text-on-surface-variant mb-2">kaelen.vance@shadowvale.io | ID: OPR_7742</p>
        <p className="text-primary font-title-sm text-title-sm">Lead Interface Engineer</p>
      </div>
    </div>
  );
};

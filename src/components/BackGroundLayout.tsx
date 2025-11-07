"use client";

interface BackgroundLayoutProps {
  children: React.ReactNode;
}

const BackgroundLayout = ({ children }: BackgroundLayoutProps) => {
  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundImage: "url('/TLApp.jpeg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
        {children}
      </div>
  );
};

export default BackgroundLayout;
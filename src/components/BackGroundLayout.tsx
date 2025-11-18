interface BackgroundLayoutProps {
  children: React.ReactNode;
}

const BackgroundLayout = ({ children }: BackgroundLayoutProps) => {
  return (
    <div
      className="
        min-w-screen
        bg-[url('/TLApp.jpeg')]   /* mobile image */
        bg-cover
        bg-center
        bg-no-repeat
        bg-fixed                  /* fixed background */

        md:bg-black              /* desktop = black */
        md:bg-none
      "
    >
      {children}
    </div>
  );
};

export default BackgroundLayout;

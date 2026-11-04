export default function SplashScreen({ onContinue }) {
  return (
    <button
      type="button"
      onClick={onContinue}
      className="grid h-dvh min-h-screen w-full place-items-center bg-brand px-10 pb-safe pl-safe pr-safe pt-safe"
      aria-label="نعمه"
    >
      <img
        src="/logo.jpg"
        alt=""
        className="w-[min(62vw,240px)] max-h-[42dvh] object-contain"
      />
    </button>
  );
}

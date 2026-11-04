export default function SplashScreen({ onContinue }) {
  return (
    <button
      type="button"
      onClick={onContinue}
      className="grid h-dvh min-h-screen w-full place-items-center bg-brand px-6 pb-safe pl-safe pr-safe pt-safe"
      aria-label="نعمه"
    >
      <img
        src="/logo.png"
        alt=""
        className="h-60 w-60 object-contain"
      />
    </button>
  );
}

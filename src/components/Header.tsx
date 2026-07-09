import BackButton from "./BackButton";

export default function Header({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between py-4 bg-white shadow-sm px-6 rounded-lg mb-6">
      <div className="flex items-center gap-4">
        <BackButton />
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
      </div>
    </header>
  );
}
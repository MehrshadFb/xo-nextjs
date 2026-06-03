import { LobbyForm } from "@/components/lobby-form";

export default function Home() {
  return (
    <main className="wood-page grid min-h-screen place-items-center px-5 py-10 text-[#24160d]">
      <section className="w-full max-w-md">
        <div className="mb-5 text-center">
          <p className="text-6xl font-black leading-none text-[#5f351c]">XO</p>
          <h1 className="mt-3 text-2xl font-black text-[#24160d]">
            Play tic-tac-toe
          </h1>
        </div>

        <LobbyForm />
      </section>
    </main>
  );
}

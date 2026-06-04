import { GameRoom } from "@/components/game-room";
import { normalizeRoomCode } from "@/lib/game";

type GamePageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

export default async function GamePage({ params }: GamePageProps) {
  const { gameId } = await params;
  const roomCode = normalizeRoomCode(gameId);

  return (
    <main className="wood-page min-h-screen px-5 py-8 text-[#24160d] sm:py-10">
      <GameRoom roomCode={roomCode} />
    </main>
  );
}

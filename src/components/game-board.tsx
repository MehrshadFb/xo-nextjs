import { Mark, markLabel } from "@/lib/game";

type GameBoardProps = {
  board: Mark[];
  interactive?: boolean;
};

export function GameBoard({ board, interactive = false }: GameBoardProps) {
  return (
    <div
      aria-label="XO board"
      className="wood-board mx-auto grid w-full max-w-[560px] grid-cols-3 gap-3 rounded-xl sm:gap-4"
      role="group"
    >
      {board.map((mark, index) => {
        const isEmpty = mark === "empty";

        return (
          <button
            key={`${mark}-${index}`}
            type="button"
            disabled={!interactive || !isEmpty}
            aria-label={
              isEmpty ? `Cell ${index + 1}, empty` : `Cell ${index + 1}, ${mark}`
            }
            className={[
              "wood-cell grid aspect-square place-items-center rounded-lg font-black transition focus:outline-none focus:ring-4 focus:ring-[#d7fff8]",
              isEmpty ? "wood-cell-empty" : "",
              mark === "x" ? "mark-x" : "",
              mark === "o" ? "mark-o" : "",
            ].join(" ")}
          >
            <span className="game-mark">{markLabel(mark)}</span>
          </button>
        );
      })}
    </div>
  );
}

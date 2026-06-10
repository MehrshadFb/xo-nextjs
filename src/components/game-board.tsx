import { Mark, markLabel, winningCellIndexes } from "@/lib/game";

type GameBoardProps = {
  board: Mark[];
  canMove?: boolean;
  isMoving?: boolean;
  onMove?: (cellIndex: number) => void;
};

export function GameBoard({
  board,
  canMove = false,
  isMoving = false,
  onMove,
}: GameBoardProps) {
  const winningCells = new Set(winningCellIndexes(board));

  return (
    <div
      aria-label="XO board"
      className="wood-board mx-auto grid w-full max-w-[560px] grid-cols-3 gap-3 rounded-xl sm:gap-4"
      role="group"
    >
      {board.map((mark, index) => {
        const isEmpty = mark === "empty";
        const isDisabled = !canMove || !isEmpty || isMoving;

        return (
          <button
            key={`${mark}-${index}`}
            type="button"
            disabled={isDisabled}
            onClick={() => onMove?.(index)}
            aria-label={
              isEmpty ? `Cell ${index + 1}, empty` : `Cell ${index + 1}, ${mark}`
            }
            className={[
              "wood-cell grid aspect-square place-items-center rounded-lg font-black transition focus:outline-none focus:ring-4 focus:ring-[#d7fff8]",
              isEmpty ? "wood-cell-empty" : "",
              winningCells.has(index) ? "wood-cell-win" : "",
              isDisabled ? "opacity-90" : "hover:-translate-y-0.5",
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

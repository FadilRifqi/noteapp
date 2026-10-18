import { getCurrentWindow } from "@tauri-apps/api/window";

type ResizeDirection =
  | "East"
  | "North"
  | "NorthEast"
  | "NorthWest"
  | "South"
  | "SouthEast"
  | "SouthWest"
  | "West";

export function ResizeHandles() {
  const handle = (direction: ResizeDirection) => (event: React.MouseEvent) => {
    event.preventDefault();
    void getCurrentWindow().startResizeDragging(direction);
  };

  const common = "absolute z-30";
  return (
    <>
      <div className={`${common} left-0 top-3 bottom-3 w-1 cursor-w-resize`} onMouseDown={handle("West")} />
      <div className={`${common} right-0 top-3 bottom-3 w-1 cursor-e-resize`} onMouseDown={handle("East")} />
      <div className={`${common} top-0 left-3 right-3 h-1 cursor-n-resize`} onMouseDown={handle("North")} />
      <div className={`${common} bottom-0 left-3 right-3 h-1 cursor-s-resize`} onMouseDown={handle("South")} />
      <div className={`${common} left-0 top-0 h-3 w-3 cursor-nw-resize`} onMouseDown={handle("NorthWest")} />
      <div className={`${common} right-0 top-0 h-3 w-3 cursor-ne-resize`} onMouseDown={handle("NorthEast")} />
      <div className={`${common} left-0 bottom-0 h-3 w-3 cursor-sw-resize`} onMouseDown={handle("SouthWest")} />
      <div className={`${common} right-0 bottom-0 h-3 w-3 cursor-se-resize`} onMouseDown={handle("SouthEast")} />
    </>
  );
}

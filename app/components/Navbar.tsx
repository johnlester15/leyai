import { BrainCircuit } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="border-b border-[#2e2e2e] bg-[#1c1c1c]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-[#3ecf8e]"><BrainCircuit size={24} /></div>
          <span className="text-lg font-bold tracking-tighter">LEYANI<span className="text-[#3ecf8e]">AI</span></span>
        </div>
        <p className="text-xs text-[#555] hidden md:block">Upload → Learn → Quiz</p>
      </div>
    </nav>
  );
}

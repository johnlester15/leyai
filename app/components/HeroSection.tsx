export default function HeroSection() {
  return (
    <div className="mb-16 text-center">
      <div className="inline-block mb-6 px-4 py-2 bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 rounded-full">
        <span className="text-xs font-bold text-[#3ecf8e] uppercase tracking-widest">Study Smarter, Not Harder</span>
      </div>
      <h1 className="text-4xl lg:text-5xl font-black mb-4 leading-tight bg-gradient-to-r from-[#ededed] to-[#a0a0a0] bg-clip-text text-transparent">
        Transform Your Notes into Knowledge
      </h1>
      <p className="text-lg text-[#707070] max-w-2xl mx-auto leading-relaxed">
        Upload your lecture notes or study materials and let AI generate comprehensive quizzes, glossaries, and case studies to supercharge your learning
      </p>
    </div>
  );
}

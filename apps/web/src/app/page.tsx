import Link from "next/link";
import { Activity, Moon, Zap, Bell, Shield, TrendingUp } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/90 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-sky-500 flex size-8 items-center justify-center rounded-lg">
              <Activity className="size-4 text-white" />
            </div>
            <span className="text-slate-800 font-semibold text-sm">Health Monitor</span>
          </div>
          <Link
            href="/login"
            className="bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-sky-600 transition"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-20 pb-16 text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-sky-50 text-sky-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-sky-100">
          <span className="size-1.5 bg-sky-400 rounded-full" />
          Integrado com Oura Ring
        </div>
        <h1 className="text-slate-900 text-4xl sm:text-5xl font-black leading-tight max-w-2xl mx-auto">
          Seu corpo fala.<br />
          <span className="text-sky-500">Aprenda a ouvir.</span>
        </h1>
        <p className="text-slate-500 text-lg max-w-xl mx-auto leading-relaxed">
          Todo dia às 7h você recebe uma análise direta: pode treinar forte hoje ou não?
          Sem jargão médico. Sem números confusos. Só a verdade.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/signup"
            className="bg-sky-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-sky-600 transition text-base"
          >
            Começar grátis
          </Link>
          <Link
            href="/login"
            className="border border-slate-200 text-slate-600 font-semibold px-6 py-3 rounded-xl hover:border-slate-300 transition text-base"
          >
            Já tenho conta
          </Link>
        </div>
      </section>

      {/* Semáforo visual */}
      <section className="max-w-5xl mx-auto px-5 pb-16">
        <div className="bg-slate-50 rounded-3xl p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { color: "bg-green-400", label: "Verde", desc: "Pode treinar forte. Corpo recuperado, sono bom, coração tranquilo." },
            { color: "bg-yellow-400", label: "Amarelo", desc: "Treina, mas reduz o volume. Algo não está 100% ainda." },
            { color: "bg-red-400", label: "Vermelho", desc: "Descansa hoje. Seu corpo precisa recuperar antes de forçar." },
          ].map((item) => (
            <div key={item.label} className="space-y-3">
              <div className={`size-12 rounded-full ${item.color} mx-auto shadow-lg`} />
              <p className="text-slate-800 font-bold text-lg">{item.label}</p>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 pb-20">
        <h2 className="text-slate-900 text-2xl font-black text-center mb-10">O que o app faz por você</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Bell, title: "Notificação às 7h", desc: "Antes de sair da cama você já sabe como está o dia." },
            { icon: Moon, title: "Análise do sono", desc: "Quanto você dormiu e como isso afeta sua energia hoje." },
            { icon: Zap, title: "Score de recuperação", desc: "Um número simples que resume se você está pronto para o treino." },
            { icon: TrendingUp, title: "Histórico 30 dias", desc: "Veja sua evolução e identifique padrões na sua recuperação." },
            { icon: Shield, title: "Dados manuais", desc: "Registre pressão, sintomas e medicamentos para análises mais precisas." },
            { icon: Activity, title: "Relatório semanal", desc: "Todo segunda, um resumo honesto de como foi sua semana." },
          ].map((f) => (
            <div key={f.title} className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="bg-sky-50 text-sky-500 size-10 flex items-center justify-center rounded-xl">
                <f.icon className="size-5" />
              </div>
              <p className="text-slate-800 font-semibold">{f.title}</p>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-sky-500 py-16 text-center space-y-5">
        <h2 className="text-white text-3xl font-black">Pronto para treinar com inteligência?</h2>
        <p className="text-sky-100 text-base max-w-md mx-auto">Conecte seu Oura Ring e comece a receber análises diárias personalizadas.</p>
        <Link
          href="/signup"
          className="inline-block bg-white text-sky-600 font-bold px-8 py-3 rounded-xl hover:bg-sky-50 transition text-base"
        >
          Criar conta grátis
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6 text-center">
        <p className="text-slate-400 text-sm">Health Monitor © 2026</p>
      </footer>
    </main>
  );
}

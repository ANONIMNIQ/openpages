"use client";

import React, { useRef, useState } from 'react';
import CardStack from '@/components/CardStack';
import TopicCard from '@/components/TopicCard';
import { motion, AnimatePresence } from 'framer-motion';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ShieldCheck, ArrowLeft, Menu, X } from 'lucide-react';

const TOPICS = [
  {
    id: 1,
    title: "Трябва ли 16-годишните да имат право да гласуват на национални избори?",
    description: "Дискусия за бъдещето на демокрацията и политическата зрялост на младото поколение.",
    participants: 1240,
    argumentsCount: 42,
    pro: [
      {
        author: "Анонимен",
        text: "Гласуването на 16 години ще увеличи политическата ангажираност в дългосрочен план, защото навикът за участие в избори се изгражда рано и после се запазва и в зряла възраст.",
        comments: [
          { id: "c1", type: "pro", text: "Съгласен съм, че ранното участие създава отговорност и по-висока активност след това." },
          { id: "c2", type: "con", text: "Има логика, но без сериозно гражданско образование ефектът може да е обратен." },
        ],
      },
      { author: "Анонимен", text: "Младежите са пряко засегнати от решенията за климата, образованието и пазара на труда, а тези политики оформят следващите десетилетия и живота им много по-силно от живота на по-възрастните поколения." },
      { author: "Анонимен", text: "На 16 години много ученици вече работят почасово, плащат данъци и носят реална икономическа отговорност, затова е логично да имат и политически глас за решенията, които ги засягат." },
      { author: "Анонимен", text: "Ако партиите знаят, че 16- и 17-годишните гласуват, ще трябва да предлагат по-сериозни идеи за качество на училищата, достъпно висше образование и първа работа за млади хора." },
      { author: "Анонимен", text: "Съвременните младежи са постоянно в информационна среда, сравняват източници, дискутират публични теми онлайн и често имат по-бърз достъп до факти, отколкото предишните поколения на същата възраст." },
      { author: "Анонимен", text: "В държави като Австрия това вече е приложено и не е довело до срив на системата, а по-скоро е стимулирало училищата и медиите да работят по-активно с гражданска грамотност." },
    ],
    con: [
      { author: "Анонимен", text: "На 16 години мозъкът и емоционалната регулация все още се развиват, а политическите решения изискват стабилна преценка за дългосрочни икономически и обществени последици." },
      { author: "Анонимен", text: "Тийнейджърите са много по-изложени на натиск от родители, инфлуенсъри и алгоритми в социалните мрежи, което може да изкриви избора им и да превърне вота в отражение на чуждо мнение." },
      {
        author: "Анонимен",
        text: "Липсата на житейски опит при теми като данъци, здравна система и пенсионни модели често води до избор на обещания, които звучат добре, но са трудно изпълними или вредни в дългосрочен план.",
        comments: [
          { id: "c3", type: "con", text: "Това е най-силният аргумент в дискусията според мен, защото засяга реални дългосрочни последици." },
        ],
      },
      { author: "Анонимен", text: "Преди да разширяваме правото на глас, трябва да изградим силно гражданско образование в училище, за да сме сигурни, че младите имат основа за критична и информирана преценка." },
      { author: "Анонимен", text: "Дори при групата 18-24 избирателната активност остава сравнително ниска, което показва, че само намаляване на възрастта не решава проблема с ангажираността и доверието в политиката." },
    ]
  },
  {
    id: 2,
    title: "Изкуственият интелект: Заплаха или възможност за образованието?",
    description: "Трябва ли ChatGPT и подобни инструменти да бъдат забранени в училищата или интегрирани в учебния процес?",
    participants: 850,
    argumentsCount: 28,
    pro: [
      { author: "Анонимен", text: "ИИ може да персонализира обучението според темпото на всеки ученик, да обяснява материала по различни начини и да помага при пропуски, без ученикът да изостава трайно от класа." },
      {
        author: "Анонимен",
        text: "Това е инструмент, който подготвя учениците за реалния пазар на труда, където работата с интелигентни системи вече е част от ежедневието в почти всяка професия.",
        comments: [
          { id: "c4", type: "pro", text: "Точно така, по-добре е училището да учи на отговорно ползване, а не на забрани." },
          { id: "c5", type: "con", text: "Съгласен съм частично, но зависи много от възрастта и контрола от учителя." },
        ],
      },
    ],
    con: [
      { author: "Анонимен", text: "Прекомерната употреба на ИИ може да доведе до мързел и загуба на критично мислене, защото учениците започват да приемат готовите отговори, вместо сами да анализират и аргументират позиция." },
      { author: "Анонимен", text: "Рискът от плагиатство е сериозен, а учителят все по-трудно различава реалните знания от машинно генериран текст, което прави оценяването по-малко честно и по-малко надеждно." },
    ]
  }
];

const Index = () => {
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<'pro' | 'con'>('pro');
  const [commentText, setCommentText] = useState('');
  const [collapseAllSignal, setCollapseAllSignal] = useState(0);
  const [isCollapsingStacks, setIsCollapsingStacks] = useState(false);
  const [activeCommentStackType, setActiveCommentStackType] = useState<'pro' | 'con' | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  const selectedTopic = TOPICS.find(t => t.id === selectedTopicId);

  const handleOpenComposer = (type: 'pro' | 'con') => {
    setComposerType(type);
    setIsComposerOpen(true);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseComposer = () => {
    setIsComposerOpen(false);
  };

  const handleCollapseAllStacks = () => {
    if (isCollapsingStacks) return;

    setIsCollapsingStacks(true);
    setActiveCommentStackType(null);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    window.setTimeout(() => {
      setCollapseAllSignal((prev) => prev + 1);
    }, 180);

    window.setTimeout(() => {
      setIsCollapsingStacks(false);
    }, 900);
  };

  const mainOverflowClass = isCollapsingStacks ? 'overflow-y-scroll' : 'overflow-y-auto';

  const handlePublishComment = (e: React.FormEvent) => {
    e.preventDefault();
    setCommentText('');
    setIsComposerOpen(false);
  };

  const handleScrollMainTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const detailStagger = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.12, delayChildren: 0.12 },
    },
  };
  const detailItem = {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <div className="min-h-screen bg-white flex font-sans selection:bg-black selection:text-white">
      {/* Main Content Column - Starts from the very left */}
      <main ref={mainRef} className={`flex-1 max-w-2xl border-r border-gray-100 h-screen ${mainOverflowClass} bg-white relative`}>
        <AnimatePresence mode="wait">
          {!selectedTopicId ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-[46rem] mx-auto px-8 md:px-12 py-16"
            >
              <header className="mb-12 flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-black tracking-tighter mb-4">Open pages</h1>
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-bold">
                    Отворена платформа за анонимни дискусии
                  </p>
                </div>
                <button className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                  <Menu size={20} />
                </button>
              </header>

              <div className="space-y-2">
                {TOPICS.map(topic => {
                  const proCount = topic.pro.length;
                  const conCount = topic.con.length;
                  const total = Math.max(proCount + conCount, 1);
                  const proShare = Math.round((proCount / total) * 100);
                  const dominantSide: 'pro' | 'con' = proShare >= 50 ? 'pro' : 'con';
                  const dominantPercent = dominantSide === 'pro' ? proShare : 100 - proShare;

                  return (
                    <TopicCard 
                      key={topic.id}
                      title={topic.title}
                      description={topic.description}
                      argumentsCount={topic.argumentsCount}
                      dominantSide={dominantSide}
                      dominantPercent={dominantPercent}
                      onClick={() => setSelectedTopicId(topic.id)}
                    />
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full max-w-[46rem] mx-auto px-8 md:px-12 py-16"
            >
              <motion.div variants={detailStagger} initial="hidden" animate="show">
                <motion.button
                  variants={detailItem}
                  onClick={() => setSelectedTopicId(null)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-12"
                >
                  <ArrowLeft size={14} /> Обратно към списъка
                </motion.button>

                <motion.header variants={detailItem} className="mb-16">
                  <div className="flex items-center gap-3 mb-8">
                    <span className="px-2 py-1 bg-black text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-sm">
                      Дебат на деня
                    </span>
                    <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold uppercase tracking-widest">
                      <ShieldCheck size={12} /> 100% Анонимно
                    </div>
                  </div>
                  
                  <h1 className="text-3xl font-black text-black leading-[1.1] tracking-tight mb-6">
                    {selectedTopic?.title}
                  </h1>
                  
                  <p className="text-sm text-gray-500 leading-relaxed max-w-md">
                    {selectedTopic?.description}
                  </p>
                </motion.header>

                <motion.div variants={detailItem} className="space-y-12">
                  <CardStack 
                    title="Аргументи ЗА" 
                    type="pro" 
                    arguments={selectedTopic?.pro || []} 
                    onCreateArgument={handleOpenComposer}
                    isCreateActive={isComposerOpen && composerType === 'pro'}
                    collapseAllSignal={collapseAllSignal}
                    onCollapseAllRequest={handleCollapseAllStacks}
                    onRequestScrollTop={handleScrollMainTop}
                    globalFocusedStackType={activeCommentStackType}
                    onFocusModeChange={setActiveCommentStackType}
                  />
                  <CardStack 
                    title="Аргументи ПРОТИВ" 
                    type="con" 
                    arguments={selectedTopic?.con || []} 
                    onCreateArgument={handleOpenComposer}
                    isCreateActive={isComposerOpen && composerType === 'con'}
                    collapseAllSignal={collapseAllSignal}
                    onCollapseAllRequest={handleCollapseAllStacks}
                    onRequestScrollTop={handleScrollMainTop}
                    globalFocusedStackType={activeCommentStackType}
                    onFocusModeChange={setActiveCommentStackType}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isComposerOpen && selectedTopic && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed left-0 bottom-0 w-full max-w-2xl h-screen bg-black/10 z-40"
                onClick={handleCloseComposer}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="fixed left-0 right-auto top-[22rem] md:top-[24rem] bottom-0 w-full max-w-2xl z-50 rounded-t-2xl bg-white border-t border-gray-200 shadow-[0_-20px_50px_rgba(0,0,0,0.08)]"
              >
                <div className="h-full overflow-y-auto p-6 md:p-8 flex flex-col">
                  <div className="flex items-center justify-between mb-6 shrink-0">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 mb-2">Нов аргумент</p>
                      <h3 className="text-lg font-black tracking-tight text-black">
                        {selectedTopic.title}
                      </h3>
                    </div>
                    <button
                      onClick={handleCloseComposer}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label="Затвори формата"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handlePublishComment} className="flex-1 min-h-0 flex flex-col gap-5">
                    <div className="flex items-center justify-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => setComposerType('pro')}
                        className={`h-11 w-11 rounded-full border text-xl font-black transition-colors inline-flex items-center justify-center ${composerType === 'pro' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        aria-label="Избери позиция За"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerType('con')}
                        className={`h-11 w-11 rounded-full border text-xl font-black transition-colors inline-flex items-center justify-center ${composerType === 'con' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        aria-label="Избери позиция Против"
                      >
                        -
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col">
                      <label htmlFor="anonymous-comment" className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                        Коментар
                      </label>
                      <textarea
                        id="anonymous-comment"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Напиши аргумента си анонимно..."
                        className="w-full h-full min-h-[14rem] resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className={`h-11 px-6 rounded-full text-white text-[11px] font-black uppercase tracking-[0.2em] transition-colors shrink-0 self-center ${
                        composerType === 'pro' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                      }`}
                    >
                      Публикувай
                    </button>
                  </form>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        <div className="mt-auto">
          <MadeWithDyad />
        </div>
      </main>

      {/* Right Side - Context Space */}
      <div className="hidden lg:flex flex-1 bg-[#FBFBFB] items-center justify-center p-20 fixed right-0 top-0 h-full w-[calc(100%-42rem)]">
        <div className="max-w-sm opacity-10 grayscale">
          <h2 className="text-[120px] font-black leading-none tracking-tighter text-gray-200 select-none">
            OPEN PAGES
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Index;

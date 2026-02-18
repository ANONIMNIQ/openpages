"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import CardStack from '@/components/CardStack';
import TopicCard from '@/components/TopicCard';
import { motion, AnimatePresence } from 'framer-motion';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

const TOPICS = [
  {
    id: 1,
    title: "Трябва ли 16-годишните да имат право да гласуват на национални избори?",
    description: "Дискусия за бъдещето на демокрацията и политическата зрялост на младото поколение.",
    participants: 1240,
    argumentsCount: 42,
    pro: [
      { author: "Анонимен", text: "Гласуването на 16 години ще увеличи политическата ангажираност на младите хора в дългосрочен план." },
      { author: "Анонимен", text: "Младежите са пряко засегнати от решенията за климата и образованието, затова трябва да имат глас." },
      { author: "Анонимен", text: "На 16 години много младежи вече работят и плащат данъци, което оправдава правото им на вот." },
      { author: "Анонимен", text: "Това ще принуди политиците да обръщат повече внимание на проблемите на бъдещите поколения." },
      { author: "Анонимен", text: "Съвременните младежи са по-информирани благодарение на дигиталните технологии." },
      { author: "Анонимен", text: "В страни като Австрия и Естония това вече работи успешно." },
      { author: "Анонимен", text: "Младите хора носят свежа перспектива и иновативни идеи в политиката." },
    ],
    con: [
      { author: "Анонимен", text: "На 16 години мозъкът все още се развива и емоционалната зрялост не е напълно достигната." },
      { author: "Анонимен", text: "Младежите са лесно податливи на манипулация от страна на родители или социални мрежи." },
      { author: "Анонимен", text: "Липсата на житейски опит прави преценката им за икономически въпроси несигурна." },
      { author: "Анонимен", text: "По-добре е да се фокусираме върху гражданското образование, преди да дадем право на глас." },
      { author: "Анонимен", text: "Статистиката показва, че дори 18-24 годишните имат най-ниска избирателна активност." },
      { author: "Анонимен", text: "Политическите партии ще започнат да таргетират училищата по неподходящ начин." },
    ]
  },
  {
    id: 2,
    title: "Изкуственият интелект: Заплаха или възможност за образованието?",
    description: "Трябва ли ChatGPT и подобни инструменти да бъдат забранени в училищата или интегрирани в учебния процес?",
    participants: 850,
    argumentsCount: 28,
    pro: [
      { author: "Анонимен", text: "ИИ може да персонализира обучението според темпото на всеки ученик." },
      { author: "Анонимен", text: "Това е инструмент, който подготвя учениците за бъдещия пазар на труда." },
      { author: "Анонимен", text: "ИИ помага на учителите да автоматизират административните задачи." },
    ],
    con: [
      { author: "Анонимен", text: "Води до мързел и загуба на критично мислене у учениците." },
      { author: "Анонимен", text: "Риск от плагиатство и невъзможност за реална оценка на знанията." },
      { author: "Анонимен", text: "Технологията често генерира невярна информация (халюцинации)." },
    ]
  },
  {
    id: 3,
    title: "Универсален базов доход: Решение за ерата на автоматизацията?",
    description: "Трябва ли държавата да осигурява гарантиран доход на всеки гражданин без условия?",
    participants: 2100,
    argumentsCount: 56,
    pro: [
      { author: "Анонимен", text: "Премахва крайната бедност и осигурява сигурност при загуба на работа." },
      { author: "Анонимен", text: "Дава свобода на хората да се занимават с творчество и доброволчество." },
    ],
    con: [
      { author: "Анонимен", text: "Твърде скъпо за бюджета и може да доведе до висока инфлация." },
      { author: "Анонимен", text: "Намалява стимула за работа и продуктивност." },
    ]
  }
];

const Index = () => {
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  const selectedTopic = TOPICS.find(t => t.id === selectedTopicId);

  return (
    <div className="min-h-screen bg-[#FBFBFB] flex font-sans selection:bg-black selection:text-white">
      <Sidebar />
      
      <main className="flex-1 ml-16 max-w-2xl border-r border-gray-100 min-h-screen bg-white shadow-sm overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!selectedTopicId ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-10 py-16"
            >
              <header className="mb-12">
                <h1 className="text-4xl font-black tracking-tighter mb-4">VOX DEBATES</h1>
                <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">
                  Отворена платформа за анонимни дискусии
                </p>
              </header>

              <div className="space-y-2">
                {TOPICS.map(topic => (
                  <TopicCard 
                    key={topic.id}
                    {...topic}
                    onClick={() => setSelectedTopicId(topic.id)}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="px-10 py-16"
            >
              <button 
                onClick={() => setSelectedTopicId(null)}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-12"
              >
                <ArrowLeft size={14} /> Обратно към списъка
              </button>

              <header className="mb-16">
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
              </header>

              <div className="space-y-8">
                <CardStack 
                  title="Аргументи ЗА" 
                  type="pro" 
                  arguments={selectedTopic?.pro || []} 
                />
                <CardStack 
                  title="Аргументи ПРОТИВ" 
                  type="con" 
                  arguments={selectedTopic?.con || []} 
                />
              </div>

              <div className="mt-20 pt-12 border-t border-gray-50">
                <button className="w-full bg-black text-white py-5 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-gray-900 transition-colors shadow-2xl flex items-center justify-center gap-3">
                  Добави анонимен аргумент
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="mt-auto">
          <MadeWithDyad />
        </div>
      </main>

      <div className="hidden lg:flex flex-1 bg-[#FBFBFB] items-center justify-center p-20 fixed right-0 top-0 h-full w-[calc(100%-42rem-4rem)]">
        <div className="max-w-sm opacity-10 grayscale">
          <h2 className="text-[120px] font-black leading-none tracking-tighter text-gray-200 select-none">
            VOX
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Index;
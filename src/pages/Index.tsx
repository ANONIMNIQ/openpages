"use client";

import React from 'react';
import Sidebar from '@/components/Sidebar';
import CardStack from '@/components/CardStack';
import { motion } from 'framer-motion';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ShieldCheck } from 'lucide-react';

const Index = () => {
  const proArguments = [
    { author: "Анонимен", text: "Гласуването на 16 години ще увеличи политическата ангажираност на младите хора в дългосрочен план." },
    { author: "Анонимен", text: "Младежите са пряко засегнати от решенията за климата и образованието, затова трябва да имат глас." },
    { author: "Анонимен", text: "На 16 години много младежи вече работят и плащат данъци, което оправдава правото им на вот." },
  ];

  const conArguments = [
    { author: "Анонимен", text: "На 16 години мозъкът все още се развива и емоционалната зрялост не е напълно достигната." },
    { author: "Анонимен", text: "Младежите са лесно податливи на манипулация от страна на родители или социални мрежи." },
    { author: "Анонимен", text: "Липсата на житейски опит прави преценката им за икономически въпроси несигурна." },
  ];

  return (
    <div className="min-h-screen bg-[#FBFBFB] flex font-sans selection:bg-black selection:text-white">
      <Sidebar />
      
      {/* Main Content Column - Left Aligned */}
      <main className="flex-1 ml-16 max-w-2xl border-r border-gray-100 min-h-screen bg-white shadow-sm">
        <div className="px-10 py-16">
          {/* Header Section */}
          <motion.header 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-16"
          >
            <div className="flex items-center gap-3 mb-8">
              <span className="px-2 py-1 bg-black text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-sm">
                Дебат на деня
              </span>
              <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold uppercase tracking-widest">
                <ShieldCheck size={12} /> 100% Анонимно
              </div>
            </div>
            
            <h1 className="text-3xl font-black text-black leading-[1.1] tracking-tight mb-6">
              Трябва ли 16-годишните да имат право да гласуват на национални избори?
            </h1>
            
            <p className="text-sm text-gray-500 leading-relaxed max-w-md">
              Дискусия за бъдещето на демокрацията. Споделете мнението си без страх от предразсъдъци. Без регистрация. Без следене.
            </p>
          </motion.header>

          {/* Vertical Stacks */}
          <div className="space-y-8">
            <CardStack 
              title="Аргументи ЗА" 
              type="pro" 
              arguments={proArguments} 
            />
            <CardStack 
              title="Аргументи ПРОТИВ" 
              type="con" 
              arguments={conArguments} 
            />
          </div>

          {/* Quick Action */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="mt-20 pt-12 border-t border-gray-50"
          >
            <button className="w-full bg-black text-white py-5 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-gray-900 transition-colors shadow-2xl flex items-center justify-center gap-3">
              Добави анонимен аргумент
            </button>
            <p className="text-center text-[9px] text-gray-400 mt-6 uppercase tracking-widest font-bold">
              Вашият IP адрес не се записва
            </p>
          </motion.div>
        </div>
        
        <div className="mt-auto">
          <MadeWithDyad />
        </div>
      </main>

      {/* Right Side - Empty/Context Space (Swiss Design) */}
      <div className="hidden lg:flex flex-1 bg-[#FBFBFB] items-center justify-center p-20">
        <div className="max-w-sm opacity-20 grayscale">
          <h2 className="text-[120px] font-black leading-none tracking-tighter text-gray-200 select-none">
            VOX
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Index;
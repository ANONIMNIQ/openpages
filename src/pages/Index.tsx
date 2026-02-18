"use client";

import React from 'react';
import Sidebar from '@/components/Sidebar';
import CardStack from '@/components/CardStack';
import { motion } from 'framer-motion';
import { MadeWithDyad } from '@/components/made-with-dyad';

const Index = () => {
  const proArguments = [
    { author: "Михаил", text: "Гласуването на 16 години ще увеличи политическата ангажираност на младите хора в дългосрочен план." },
    { author: "Анна", text: "Младежите са пряко засегнати от решенията за климата и образованието, затова трябва да имат глас." },
    { author: "Виктор", text: "На 16 години много младежи вече работят и плащат данъци, което оправдава правото им на вот." },
    { author: "Елена", text: "Това ще принуди политиците да обръщат повече внимание на проблемите на бъдещите поколения." },
    { author: "Кристиян", text: "Съвременните младежи са по-информирани благодарение на дигиталните технологии." },
  ];

  const conArguments = [
    { author: "Георги", text: "На 16 години мозъкът все още се развива и емоционалната зрялост не е напълно достигната." },
    { author: "Мария", text: "Младежите са лесно податливи на манипулация от страна на родители или социални мрежи." },
    { author: "Иван", text: "Липсата на житейски опит прави преценката им за икономически въпроси несигурна." },
    { author: "София", text: "По-добре е да се фокусираме върху гражданското образование, преди да дадем право на глас." },
    { author: "Петър", text: "Статистиката показва, че дори 18-24 годишните имат най-ниска избирателна активност." },
  ];

  return (
    <div className="min-h-screen bg-[#FBFBFB] pl-16 font-sans selection:bg-black selection:text-white">
      <Sidebar />
      
      <main className="max-w-6xl mx-auto px-8 py-16">
        {/* Header Section */}
        <motion.header 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-20"
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="px-2 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded">
              Активен Дебат
            </span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
              Създаден преди 2 дни • 1.2к участници
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-black leading-tight tracking-tight mb-8 max-w-3xl">
            Трябва ли 16-годишните да имат право да гласуват на национални избори?
          </h1>
          
          <div className="flex items-center gap-6 border-b border-gray-100 pb-8">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="user" />
                </div>
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-white bg-black flex items-center justify-center text-[10px] text-white font-bold">
                +84
              </div>
            </div>
            <p className="text-sm text-gray-500 italic">
              "Това е фундаментален въпрос за бъдещето на демокрацията ни."
            </p>
          </div>
        </motion.header>

        {/* Debate Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
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

        {/* Footer Action */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-32 text-center border-t border-gray-100 pt-16"
        >
          <h2 className="text-xl font-bold mb-4">Имате какво да добавите?</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto text-sm">
            Вашият глас е важен. Присъединете се към дискусията и помогнете за изграждането на по-добро разбиране.
          </p>
          <button className="bg-black text-white px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-xl">
            Добави нов аргумент
          </button>
        </motion.div>
      </main>
      
      <MadeWithDyad />
    </div>
  );
};

export default Index;
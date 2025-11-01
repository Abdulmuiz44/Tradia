       <div className="px-4 py-6">
         <div className="mx-auto w-full max-w-3xl space-y-4">
           {selectedTradeIds.length > 0 && (
             <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-2 text-sm text-sky-200 backdrop-blur-sm">
               <Paperclip className="h-4 w-4" />
               <span>
                 {selectedTradeIds.length} trade{selectedTradeIds.length !== 1 ? "s" : ""} attached
               </span>
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => onTradeSelect?.([])}
                 className="h-6 rounded-full px-3 text-xs text-white/70 hover:bg-white/10"
               >
                 Clear
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={handleAttachTrades}
                 className="h-6 rounded-full border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20"
               >
                 Attach to next prompt
               </Button>
             </div>
           )}

           <div className="relative">
             <div className="flex items-center gap-3 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3 shadow-lg">
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={handleAttachTrades}
                 className="h-10 w-10 rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                 title="Attach trades"
               >
                 <Paperclip className="h-5 w-5" />
               </Button>

               <textarea
                 ref={textareaRef}
                 value={inputMessage}
                 onChange={(event) => {
                   setInputMessage(event.target.value);
                   const target = event.target as HTMLTextAreaElement;
                   target.style.height = "auto";
                   target.style.height = Math.min(target.scrollHeight, 180) + "px";
                 }}
                 onKeyDown={handleKeyDown}
                 onDrop={(event) => {
                   event.preventDefault();
                   const data = event.dataTransfer.getData("application/json");
                   if (!data) return;
                   try {
                     const trade = JSON.parse(data);
                     if (trade?.id) {
                       const ids = new Set(selectedTradeIds);
                       ids.add(trade.id);
                       onTradeSelect?.(Array.from(ids));
                     }
                   } catch (error) {
                     console.error("Failed to parse dropped trade:", error);
                   }
                 }}
                 onDragOver={(event) => event.preventDefault()}
                 placeholder="Ask about your trading performance..."
                 className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none min-h-[44px]"
                 rows={1}
                 style={{ height: "auto", minHeight: "44px" }}
               />

               <div className="flex items-center gap-3">
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={onVoiceInput}
                   className={`h-10 w-10 rounded-full p-0 transition-colors ${
                     isListening ? "text-rose-300 hover:text-rose-200" : "text-white/60 hover:text-white/80"
                   }`}
                 >
                   {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                 </Button>

                 <Select value={model} onValueChange={onModelChange}>
                   <SelectTrigger className="h-8 w-[110px] rounded-full bg-transparent px-3 text-xs text-white/70 transition-colors hover:bg-white/10 focus:outline-none focus:ring-0 border-0">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent
                     side="top"
                     className="border border-white/10 bg-[#040A18]/95 text-white shadow-[0_12px_40px_rgba(4,10,24,0.6)] backdrop-blur"
                   >
                     <SelectItem
                       value="gpt-4o-mini"
                       className="rounded-lg text-sm text-white/80 focus:bg-white/10 focus:text-white"
                     >
                       GPT-4o Mini
                     </SelectItem>
                     <SelectItem
                       value="gpt-4"
                       className="rounded-lg text-sm text-white/80 focus:bg-white/10 focus:text-white"
                     >
                       GPT-4
                     </SelectItem>
                     <SelectItem
                       value="gpt-3.5-turbo"
                       className="rounded-lg text-sm text-white/80 focus:bg-white/10 focus:text-white"
                     >
                       GPT-3.5 Turbo
                     </SelectItem>
                   </SelectContent>
                 </Select>

                 <Button
                   onClick={handleSendMessage}
                   disabled={!inputMessage.trim()}
                   className="h-10 w-10 rounded-full bg-sky-500 p-0 text-white shadow-[0_8px_24px_rgba(56,189,248,0.35)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-white/10 hover:shadow-[0_8px_24px_rgba(56,189,248,0.5)]"
                 >
                   <Send className="h-4 w-4" />
                 </Button>
               </div>
             </div>

             <div className="flex items-center justify-between mt-2 px-1">
               <span className="text-xs text-white/50">Shift + Enter for new line</span>
               <span className="text-xs text-white/50">{inputMessage.length} characters</span>
             </div>
           </div>
         </div>
       </div>

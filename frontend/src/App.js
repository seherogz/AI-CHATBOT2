import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'; //dom: html+css+js 
import './App.css';
import Login from './components/Login'; 
import Register from './components/Register';
import ModelSelector from './components/ModelSelector';
import LanguageSelector from './components/LanguageSelector';
import api from './services/api'; //API dosyası: Backend'e veri göndermek veya veri almak için kullanılır.
import HotelSelector from './components/HotelSelector';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); //Giriş yapan kullanıcının bilgilerini tutar. useState durumları saklamak için kullanılır.
  const [chats, setChats] = useState([]); 
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]); // Şu anki sohbetin mesajları
  const [inputMessage, setInputMessage] = useState(''); // Bu satırı ekle
  const [isLoading, setIsLoading] = useState(false); 
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('tr'); 
  const [selectedModel, setSelectedModel] = useState('openai/gpt-3.5-turbo'); 
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [darkMode, setDarkMode] = useState(false); 
  
  const CHATS_KEY = 'ai_chatbot_chats'; // Tüm sohbetlerin saklandığı key
  const CURRENT_CHAT_KEY = 'ai_chatbot_current_chat'; // Şu anki seçili sohbetin ID'sinin saklandığı key
  
  // Seçim değişikliklerini backend'e bildiren fonksiyonlar
  const handleModelChange = async (newModel) => {
    setSelectedModel(newModel);
    if (isAuthenticated) {
      try {
        await api.updateUserPreferences(newModel, language, selectedHotel?.id || null);
        console.log('Model preference updated:', newModel);
      } catch (error) {
        console.error('Failed to update model preference:', error);
      }
    }
  };

  const handleLanguageChange = async (newLanguage) => { //dil değiştiğinde asıl bu fonksyion çalışır.
    setLanguage(newLanguage); //Uygulamanın içindeki language state'i yeni seçilen dil olarak güncellenir. uı'da güncellenir.
    if (isAuthenticated) {// Giriş yapılmamışsa, sadece state güncellenir ama sunucuya istek gönderilmez.
      try {
        await api.updateUserPreferences(selectedModel, newLanguage, selectedHotel?.id || null); //Bu satır sunucuya "kullanıcının yeni dil tercihi bu" demek için kullanılır.
        console.log('Language preference updated:', newLanguage);
      } catch (error) {
        console.error('Failed to update language preference:', error);
      }
    }
  };

  const handleHotelChange = async (newHotel) => {
    setSelectedHotel(newHotel);
    if (isAuthenticated) {
      try {
        await api.updateUserPreferences(selectedModel, language, newHotel?.id || null);
        console.log('Hotel preference sent to backend:', newHotel?.id);
      } catch (error) {
        console.error('Failed to update hotel preference:', error);
      }
    }
    
    // Eğer bir otel seçildiyse ve aktif bir sohbet varsa, kullanıcıya bilgi ver
    if (newHotel && newHotel.id !== 'none' && currentChatId && messages.length > 0) { //ilk otel seçeriz sonra gerçek otel seçip seçmediğimizi kontrol eder daha önce mesjalar yazılmış mı aktif sphbet var mı kontrol eder.
      const hotelInfoMessage = {
        id: `ai_${Date.now()}`,
        text: `🏨 ${newHotel.name} temsilcisi olarak size yardımcı olmaya hazırım! ${newHotel.description} hakkında sorularınızı yanıtlayabilirim.`,
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      
      const updatedMessages = [...messages, hotelInfoMessage]; //önceki mesaların sonuna son mesaj ekleniyor aiden gelen.
      setMessages(updatedMessages);//State (ekran) güncelleniyor → setMessages
      updateChatMessages(currentChatId, updatedMessages);//Eğer bu mesajları kalıcı olarak saklıyorsan updateChatMessages(chatId, updatedMessages) ile güncelleniyor
    }
  };
  
  const [editingMessageId, setEditingMessageId] = useState(null); //Kullanıcının düzenlemek istediği mesajın ID’sini tutar.seteEditingMessageId fonksiyonu ile güncellenir. Eğer düzenleme modunda değilse null olur.
  const [editingChatId, setEditingChatId] = useState(null); 
  const [editingChatTitle, setEditingChatTitle] = useState('');
  const [editingText, setEditingText] = useState(''); // Düzenlenmekte olan mesajın metni
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // LocalStorage yönetim fonksiyonları
  const loadChatsFromStorage = () => { //LocalStorage’da kayıtlı sohbet verilerini alıp ekrana (state’e) yükleme
    try {
      const storedChats = localStorage.getItem(CHATS_KEY);  //"ai_chatbot_chats" gibi bir anahtarla kayıtlı sohbetleri alır ve storedchat'e atar.
      if (storedChats) { //Eğer localStorage’da veri varsa, bu veri string formundadır.
        const parsedChats = JSON.parse(storedChats); // JSON.parse ile string’i nesneye çeviririz.
        setChats(parsedChats);  //chat ekranı güncellenir.sohbetler görünür
        console.log('Chats loaded from localStorage:', parsedChats.length);
      }
    } catch (error) {
      console.error('Error loading chats from localStorage:', error);
    }
  };

  const saveChatsToStorage = (chatsToSave) => { //sohbet kaydetme,chattosave, kaydedilecek sohbetlerin listesini alır ve kaydediyorum localstorageye
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify(chatsToSave)); //sohbet verileri (chatsToSave) string’e çevrilerek CHATS_KEY adıyla tarayıcıya kaydedilir
      console.log('Chats saved to localStorage:', chatsToSave.length); //localstorage.setItem:bu stringi tarayıcıya kaydeder.
    } catch (error) {
      console.error('Error saving chats to localStorage:', error);
    }
  };

  //Normalde tarayıcıyı yenilersen hangi sohbet açıktı bilgisi kaybolur. Ama bu fonksiyon sayesinde: id:2 olan sohbeti açtığında, tarayıcıyı yenilesen bile bu sohbeti tekrar açtığında id:2 olan sohbeti açar.
  const loadCurrentChatFromStorage = () => { //Parametre almaz, çünkü tüm veri localStorage’da kayıtlıdır.
    try {
      const storedChatId = localStorage.getItem(CURRENT_CHAT_KEY); // "ai_chatbot_current_chat" anahtarıyla kayıtlı olan sohbet ID'sini alır ve locale kaydeder.
      if (storedChatId) {
        setCurrentChatId(storedChatId); //localStorage’dan en son açık sohbetin ID’si (storedChatId) alınır.setCurrentChatId(storedChatId) ile bu ID React’e aktarılır.Ekranda o ID’ye ait sohbet otomatik olarak yeniden görüntülenir.
        console.log('Current chat loaded from localStorage:', storedChatId);
      }
    } catch (error) {
      console.error('Error loading current chat from localStorage:', error);
    }
  };

  const saveCurrentChatToStorage = (chatId) => { //Yani bu sefer sohbeti kaydediyoruz ki sonra geri yükleyebilelim. parametre olarak chatıd alır ki sonra o chat id'e sahip olan chati tekrardan yükleyebilelim. 
    try {
      if (chatId) { //Bu, şu anda açık olan sohbetin ID’sidir,eğer geçerli id varsa
        localStorage.setItem(CURRENT_CHAT_KEY, chatId);  //chatid:3 ise artık bu chat hafızaya current chat key oalrak kaydedeilir.
        localStorage.removeItem(CURRENT_CHAT_KEY); //eğer chatId yoksa, yani hiçbir sohbet seçili değilse, localStorage'dan bu kaydı kaldırır. sebebi de sayfa yenilendiğinde eski bir sohbet yanlışlıkla tekrar açılmasın.
      }
      console.log('Current chat saved to localStorage:', chatId);
    } catch (error) {
      console.error('Error saving current chat to localStorage:', error);
    }
  };

  // Uygulama başladığında token kontrolü, giriş yaptıktan sonra bu fonk çalışır.
  useEffect(() => {//uygulama ilk açıldğında token kontrolü yapar ve kullanıcıyı oturum açmış mı değil mi kontrol eder.
    console.log('useEffect[1]: Token check started');
    const checkAuth = async () => {
      if (api.isAuthenticated()) { //tarayıcıda token var mı mı kontrol ediyor.local storage'da token varsa, kullanıcı giriş yapmış demektir.
        try {
          console.log('useEffect[1]: User is authenticated, checking profile...');
          const response = await api.getProfile();  //eğer token varsa, API'den kullanıcı profilini alır. Bu, kullanıcının geçerli bir oturum açıp açmadığını kontrol etmek için yapılır.
          if (response.success) {
            console.log('useEffect[1]: Profile check successful, setting auth state');
            setIsAuthenticated(true); // Kullanıcıyı oturum açmış olarak işaretler.
            setCurrentUser(response.user); // Kullanıcı bilgilerini(mail,username,işd gibi) state'e kaydeder.
            
            if (response.user.preferredModel) { // daha önce seçilmiş bir modeli varsa onu ayarlar.
              setSelectedModel(response.user.preferredModel); 
            }
            if (response.user.preferredLanguage) {
              setLanguage(response.user.preferredLanguage);
            }
            
            // Eğer login sayfasındaysa chat ekranına yönlendir
            if (window.location.pathname === '/login') {
              navigate('/');
            }
          } else { //API’den geçerli kullanıcı bilgisi gelmediyse, token silinip kullanıcı çıkış yaptırılır.
            console.log('useEffect[1]: Profile check failed, logging out');
            api.logout();
            setIsAuthenticated(false); // Kullanıcıyı oturum açmamış olarak işaretler.
            setCurrentUser(null); 
          }
        } catch (error) { //eğer API çağrısı sırasında bir hata oluşursa, kullanıcı çıkış yaptırılır.
          console.error('useEffect[1]: Auth check failed:', error);
          api.logout();
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } else {
        console.log('useEffect[1]: No token found');
      }
      
      loadChatsFromStorage(); //localStorage’da saklanan önceki sohbetler ve son aktif sohbet ID’si yüklenir.
      loadCurrentChatFromStorage();
    };

    checkAuth(); //Yukarıdaki fonksiyon çağrılıyor, böylece bu işlemler tetikleniyor.
  }, [navigate]); // //navigate bağımlılığı, useEffect'in sadece bu fonksiyon değiştiğinde yeniden çalışmasını sağlar.

  useEffect(() => { //currentChatId her değiştiğinde bu blok çalıştırılır.
    saveCurrentChatToStorage(currentChatId); // Böylece kullanıcı bir sohbet seçtiğinde veya sohbet değiştiğinde, bu sohbetin ID'si localStorage'a kaydedilir.
  }, [currentChatId]); //sadece currentChatId değiştiğinde çalışır. Başka hiçbir şey bu bloğu tetiklemez.

  // Chats değiştiğinde localStorage'a kaydet. tüm sohbet listesini içerikleri ile birlikte kaydeder.
  useEffect(() => {
    if (chats.length > 0) { //Eğer sohbet listesi boş değilse 
      saveChatsToStorage(chats); //chatler localstorage'ye eklenir.
    }
  }, [chats]); //sadece chats state'i değiştiğinde çalışacak şekilde ayarlanmıştır.

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {//mesaj her değiştiğinde bu fonk çağrılır ve otomatik kaydırılır.
    scrollToBottom();
  }, [messages]);

  const handleLogin = async (username, password) => {
    try {
      setError(null);
      setIsLoading(true);
      
      console.log('Attempting login with:', { username });
      const response = await api.login(username, password); //api.js içindeki login fonksiyonu çağrılır. Backend'e istek atılır.api.js içindeki login() fonksiyonu çağrılır.Sunucuya POST /api/auth/login isteği gönderilir.
      console.log('Login response:', response);
      
      if (response.success) { //fonk cevabı eğer doğruysa
        setIsAuthenticated(true);
        setCurrentUser(response.user); //gelen kullanıcı bilgileri belleğerw yazılır.
        // Başarılı giriş sonrası chat ekranına yönlendir
        navigate('/');
        return { success: true };
      } else {
        const errorMessage = response.message || 'Giriş yapılırken bir hata oluştu'; //backendden gelen hata
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Giriş yapılırken bir hata oluştu'; //apiden gelen hata
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally { 
      setIsLoading(false);
    }
  };

  const handleRegister = async (username, email, password) => {
    try {
      setError(null);//Önceki hata temizlenir, yükleniyor durumu aktif hale getirilir (örneğin buton disabled olabilir).
      setIsLoading(true);
      
      console.log('Attempting register with:', { username, email });
      const response = await api.register(username, email, password);
      console.log('Register response:', response);
      
      if (response.success) {
        setIsAuthenticated(true);
        setCurrentUser(response.user);
        // loadChats() çağrısını kaldırdık çünkü useEffect'te zaten çağrılıyor
        // Başarılı kayıt sonrası chat ekranına yönlendir
        navigate('/');
        return { success: true };
      } else {
        // Backend'den gelen hata mesajını kullan
        const errorMessage = response.message || 'Kayıt olurken bir hata oluştu';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Register error:', error);
      // API'den gelen hata mesajını kullan
      const errorMessage = error.message || 'Kayıt olurken bir hata oluştu';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = () => { //yeni sohbet butonuna basınca tetiklenir.
    try {
      setError(null); //önceki hata varsa temizlenir.
      
      const newChatId = `chat_${Date.now()}`; //yeni sohbet ID'si oluşturulur. 
      const newChat = { //chat objesi oluşturulur.
        id: newChatId,
        title: `Sohbet ${chats.length + 1}`,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('Creating new chat:', newChat);
      
      const updatedChats = [...chats, newChat]; //önceki sohbet listesine yeni sohbet eklenir.
      setChats(updatedChats); // state(chat listesi) güncellenir.
      setCurrentChatId(newChatId); // yeni sohbet seçilir.
      setMessages([]); // yeni sohbet için mesajlar temizlenir. henüz mesaj yoktur.
      
      // Eğer bir otel seçiliyse, yeni sohbette otel bilgisini göster
      if (selectedHotel && selectedHotel.id !== 'none') {
        const hotelWelcomeMessage = {
          id: `ai_${Date.now()}`,
          text: `🏨 Merhaba! ${selectedHotel.name} temsilcisi olarak size yardımcı olmaya hazırım! ${selectedHotel.description} hakkında sorularınızı yanıtlayabilirim.`,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
        
        const updatedMessages = [hotelWelcomeMessage];
        setMessages(updatedMessages);
        
        // Yeni sohbeti güncellemek için updatedChats kullan
        const finalUpdatedChats = updatedChats.map(chat => 
          chat.id === newChatId 
            ? { 
                ...chat, 
                messages: updatedMessages,
                updatedAt: new Date().toISOString() 
              }
            : chat
        );
        setChats(finalUpdatedChats);
      }
      
      console.log('New chat created successfully');
    } catch (error) {
      console.error('Create chat error:', error);
      setError('Yeni sohbet oluşturulamadı.');
    }
  };



  const selectChat = (chatId) => { //var olan sohbeti seçer
    // Eğer zaten seçili sohbet ise, gereksiz işlem yapma
    if (currentChatId === chatId) {
      console.log('Chat already selected, skipping:', chatId);
      return;
    }

    try {
      setError(null); // Önceki hatayı temizle
      setCurrentChatId(chatId); // Şu anki sohbet ID'sini güncelle
      
      console.log('Selecting chat:', chatId);
      
      // localStorage'dan seçili chat'in mesajlarını yükle
      const chat = chats.find(c => c.id === chatId); //chat dizininin içinde bu id'ye sahip olan chat bulunur
      if (chat && chat.messages) { 
        setMessages(chat.messages);// sohbet mesajlarını yükler.
        console.log('Chat messages loaded:', chat.messages.length);
      } else { 
        setMessages([]);
        console.log('No messages found for chat:', chatId);
      }
    } catch (error) {
      console.error('Select chat error:', error);
      setError('Sohbet seçilemedi.');
    }
  };

  const sendMessage = async () => { // Kullanıcının yazdığı mesajı ekler, AI'den cevap alır, sohbeti günceller.
    if (!inputMessage.trim() || !currentChatId) return; // Eğer mesaj boşsa veya sohbet seçilmemişse hiçbir şey yapma.

    const userMessage = { // Kullanıcının mesajını obje haline getirir.
      id: `user_${Date.now()}`,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage]; // önceki mevcut mesajların sonuna kullanıcı mesajını ekler.
    setMessages(updatedMessages); //mesaj listesi güncellenir
    setInputMessage(''); 
    setIsLoading(true); 
    setError(null); 

    try {
      console.log('Sending message to AI:', { message: inputMessage, model: selectedModel, language: language });
      //Kullanıcının yazdığı mesajı, daha önceki konuşmaları da referans alarak, seçilen AI modeline gönderir ve AI’dan dönen cevabı aiText olarak alır.
      const conversationHistory = updatedMessages.slice(0, -1).map(msg => ({ //Kullanıcı mesajı da dahil olmak üzere anlık tüm mesajlar. ama son mesajı hariçtir çünkü ai'ye daha bu mesaj gönderilmedi.
        role: msg.sender === 'user' ? 'user' : 'assistant', //map sayesinde her mesajı role,content olarak ayırlar. 
        content: msg.text
      }));
      
      // Seçilen otel promptunu ekle
      let systemPrompt = '';
      if (selectedHotel && selectedHotel.prompt) {
        systemPrompt = selectedHotel.prompt;
      }
      
      //backend üzerinden openAı'e istek atar
      const response = await api.sendAIMessage(inputMessage, conversationHistory, selectedModel, language, systemPrompt); // Kullanıcının yazdığı mesajı, önceki konuşmalarla birlikte OpenAI’ye gönderir ve cevabını bekler. OpenAI cevabı dönene kadar bekler ve o cevabı response değişkenine atar.
      console.log('AI response:', response);
      
      let aiText = response.aiResponse; //AI'den gelen cevabı alır. response.aiResponse: API'den dönen AI cevabıdır.

      // Anahtar kelimelerden biri geçiyorsa canlı destek mesajı ekle
      const mustRedirect = [
        "AI asistanı olarak", "gerçekleştiremiyorum", "yardımcı olamıyorum", "ben bir AI asistanıyım",
        "rezervasyon yapabilme", "doğrudan rezervasyon", "rezervasyon işlemlerini"
      ].some(keyword => aiText.includes(keyword));

      if (mustRedirect) {
        aiText += "\n\n **Rezervasyon İşlemi İçin Müşteri Temsilcisine Yönlendirme**\n\n";
        aiText += "Rezervasyon bilgilerinizi aldım ve sistemimize kaydettim. ";
        aiText += "Size en uygun seçenekleri sunabilmek ve rezervasyon işleminizi tamamlayabilmek için ";
        aiText += "deneyimli müşteri temsilcilerimizle görüşmenizi öneriyorum.\n\n";
        aiText += "📞 **Canlı Destek Hattı:** +90 xxx xxx xx xx\n";
        aiText += "💬 **WhatsApp:** +90 xxx xxx xx xx\n";
        aiText += "📧 **E-posta:** rezervasyon@oteladi.com\n\n";
        aiText += "Müşteri temsilcilerimiz size şu konularda yardımcı olacaktır:\n";
        aiText += "• Detaylı oda seçenekleri ve fiyatlandırma\n";
        aiText += "• Özel istekleriniz ve özel talepleriniz\n";
        aiText += "• Ödeme seçenekleri ve güvenli rezervasyon\n";
        aiText += "• Transfer ve ek hizmetler\n\n";
        aiText += "Size en kısa sürede dönüş yapılacaktır. Başka sorularınız varsa yardımcı olmaktan mutluluk duyarım!";
      }

      // Sonra aiText'i mesaj olarak ekle
      const aiMessage = {
        id: `ai_${Date.now()}`,
        text: aiText,
        sender: 'ai',
        timestamp: new Date().toISOString()
      };

      // AI mesajını ekle
      const finalMessages = [...updatedMessages, aiMessage]; //Kullanıcının mesajını içeren updatedMessages listesine, AI cevabı olan aiMessage eklenir.
      setMessages(finalMessages); //Mesajlar state'i güncellenir → kullanıcı arayüzünde görünür. 
      
      // Chat'i güncelle ve localStorage'a kaydet
      updateChatMessages(currentChatId, finalMessages); //Aktif sohbetin (currentChatId) içeriği  finalmessage ile güncellenir
    } catch (error) {
      console.error('Send message error:', error);
      // Hata durumunda kullanıcı mesajını kaldır
      setMessages(messages);
      setError('Mesaj gönderilemedi.');
    } finally {
      setIsLoading(false); //loading false olur, örneğin buton aktifleştirirlir. 
    }
  };

  // Chat mesajlarını güncelle ve localStorage'a kaydet
  const updateChatMessages = (chatId, newMessages) => { //hangi sohbetin güncelleneceği ve yeni mesajların ne olacağı parametre olarak alınır.
    try {
      const updatedChats = chats.map(chat => //tğm chatler kontrol edilir, Eğer bu chat.id, parametre olarak gelen chatId ile eşleşiyorsa güncelleme yapılır.
        chat.id === chatId  //Eğer bu chat nesnesinin ID’si, güncellemek istediğin chatId ile eşitse:
          ? { 
              ...chat,  //eski sohbetin tüm özelliklerini al.
              messages: newMessages,  //güncel mesaj listesini bunun içine koy
              updatedAt: new Date().toISOString() 
            }
          : chat//Eğer ID eşleşmiyorsa, sohbet olduğu gibi kalır
      );
      setChats(updatedChats); //Yeni sohbet listesi chats state’ine kaydedilir.
      console.log('Chat messages updated for:', chatId);
    } catch (error) {
      console.error('Error updating chat messages:', error);
    }
  };

  const deleteChat = (chatId) => { // silinecek sohbetin ID'sini parametre olarak alır.
    try { 
      setError(null); 
      
      console.log('Deleting chat:', chatId);
      
      // Chat'i listeden kaldır
      const updatedChats = chats.filter(chat => chat.id !== chatId); //filter metodu sayesinde: chats dizisinden chatId’si eşleşmeyenleri tutar.Böylece silmek istenen sohbet diziden çıkarılmış olur
      setChats(updatedChats);
      
      // Eğer silinen chat şu an seçili ise, seçimi kaldır
      if (currentChatId === chatId) {
        setCurrentChatId(null); //seçim sıfırlanır, böylece artık bu sohbet aktif değil.
        setMessages([]); // mesajlar temizlenir, çünkü artık bu sohbet yok.
      }
      
      console.log('Chat deleted successfully:', chatId);
    } catch (error) {
      console.error('Delete chat error:', error);
      setError('Sohbet silinemedi.');
    }
  };

  const startEditMessage = (messageId, currentText) =>{  //sadece düzenleme modunu a.ar,düzenleme yapmaz. 
    setEditingMessageId(messageId); //hangi mesaj düzenleniyor
    setEditingText(currentText);//  Şu anki mesaj içeriğini input kutusuna koyar
  }

  const cancelEditMessage = () => {  
    setEditingMessageId(null); // düzenleme modunu kapatır..
    setEditingText(''); 
  };

  const saveEditMessage = async (messageId) => { //düzenlenecek olan mesqajın ID'sini parametre olarak alır.
    if (!editingText.trim()) return; 
    try {
      setError(null); // Önceki hataları temizle
      setIsLoading(true); // Yükleme durumunu aktif et
      
      console.log('Updating message:', { messageId, text: editingText, model: selectedModel, language: language });
      
      // Düzenlenen mesajdan sonraki tüm mesajları kaldır
      const editedMessageIndex = messages.findIndex(msg => msg.id === messageId); //mesajların içinde düzenlenecek mesajın index'ini bulur.
      if (editedMessageIndex === -1) {
        setError('Mesaj bulunamadı.');
        return;
      }
      
      // Mesajı güncelle ve sonrasını sil
      const updatedMessages = messages.slice(0, editedMessageIndex + 1); //Düzenlenen mesaj olmak üzere ve öncesini alır(0 demsi dizinin başından alır.). Sonrasını siler çünkü artık yapay zekâ cevabı da değişmelidir.
      updatedMessages[editedMessageIndex] = { // Az önce oluşturduğumuz updatedMessages dizisinin düzenlenen mesajını alır. düzenlediğim mesaj
        ...updatedMessages[editedMessageIndex], // mevcut mesajın tüm özelliklerini korur. id'si gibi. o mesajın tüm bilgisi
        text: editingText //Bu satır, düzenlenen mesajın text (içerik) kısmını, kullanıcıdan gelen editingText ile değiştirir. Ama geri kalan bilgileri (örneğin id, timestamp, sender) korur.
      };
      
      setMessages(updatedMessages); //uı'da güncellenmiş mesajlar gösterilir.
      
      // Yeni AI cevabı al
      const conversationHistory = updatedMessages.map(msg => ({ //geçmiş konuşmaları yapay zekaya anlayacağı dilde göndermek.updatemessage ile mesajlarımı alıyor,he rmesaj için nesne döndürür.
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));
      
      // Seçilen otel promptunu ekle
      let systemPrompt = '';
      if (selectedHotel && selectedHotel.prompt) {
        systemPrompt = selectedHotel.prompt;
      }
      
      const response = await api.sendAIMessage(editingText, conversationHistory.slice(0, -1), selectedModel, language, systemPrompt); //conversationHistory.slice(0, -1) bu sayede son mesaj hariçdiğer tüm mesajlar yeni bir dizi olarak döner. Çünkü bu mesaj zaten ayrı bir parametre olarak editingText ile gönderiliyor.
      console.log('AI response for edited message:', response);
      
      if (response.success) { //sendaimessage success döndüysei
        const aiMessage = { //aiden bu mesaj alınır
          id: `ai_${Date.now()}`,
          text: response.aiResponse,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
        
        const finalMessages = [...updatedMessages, aiMessage]; //Önceki kullanıcı mesajlarını içeren updatedMessages dizisine, AI’dan gelen bu yeni mesaj aiMessage ekleniyor.
        setMessages(finalMessages);  //ani mesaj listesi yenileniyor ve ekranda görünür hale geliyor.
        
        // Chat'i güncelle ve localStorage'a kaydet
        updateChatMessages(currentChatId, finalMessages);
        
        setEditingMessageId(null); //Bu işlem sayesinde, mesaj düzenleme modu kapatılır.
        setEditingText(''); //input sıfırlanır.
      } else {
        setError(response.message || 'AI cevabı alınamadı.');
      }
    } catch (error) {
      console.error('Update message error:', error);
      setError('Mesaj güncellenemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMessage = (messageId) => { //Parametre olarak messageId alır: silinmek istenen mesajın id’sidir.
    try {
      setError(null); //önceki hatalar silinir. 
      
      console.log('Deleting message:', messageId);
      
      // Mesajı listeden kaldır
      const updatedMessages = messages.filter(msg => msg.id !== messageId); //filter(...): mesajlar dizisinden msg.id değeri messageId OLMAYANLARI ("Eğer mesajın ID’si, silinmek istenen ID’ye eşit değilse")tutar.yani eşleşenleri siler.
      setMessages(updatedMessages); //UI’da silinen mesaj anında kaybolur.
      
      // Chat'i güncelle ve localStorage'a kaydet
      updateChatMessages(currentChatId, updatedMessages); //currentchat id ve o sohbete ait mesajlar güncellenir. 
      
      console.log('Message deleted successfully:', messageId);
    } catch (error) {
      console.error('Delete message error:', error);
      setError('Mesaj silinemedi.');
    }
  };

  const startEditChatTitle = (chatId, currentTitle) => { //chatId: Hangi sohbetin başlığı düzenlenecekse onun ID’si.currentTitle: O sohbetin şu anki başlığı.
    setEditingChatId(chatId); // Düzenlenmekte olan sohbetin id’sini belleğe kaydeder. "şu anda bu ID'ye sahip sohbet düzenleniyor" diye bir işaret koyar.
    setEditingChatTitle(currentTitle);//Başlık kutusunu doldurmak için mevcut başlığı state’e atar.Kullanıcının düzenlemeye başladığı başlığı geçici olarak bir input kutusuna koymak için bu veriyi state’e atar.
  };

  const cancelEditChatTitle = () => { //ullanıcı düzenleme işlemini iptal ettiğinde çalışır.
    setEditingChatId(null); //Artık hiçbir sohbet düzenlenmiyor.
    setEditingChatTitle('');//Düzenleme kutusu temizlenir.
  };

  const saveEditChatTitle = (chatId) => { //
    if (!editingChatTitle.trim()) return; //boşluk dışında bir şey yazmadıysa o yazıyı döndürür.

    try {
      setError(null);
      
      console.log('Updating chat title:', { chatId, title: editingChatTitle }); //chats: tüm sohbetlerin bulunduğu dizi. map(...): her sohbeti kontrol eder.
      
      // Chat başlığını güncelle
      const updatedChats = chats.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat,  //mevuct bilgileri korur
              title: editingChatTitle, //başlık değiştirilir.
              updatedAt: new Date().toISOString() //zamn değişir.
            } 
          : chat
      );
      
      setChats(updatedChats); //Güncellenmiş sohbet dizisi UI’da gösterilir.
      setEditingChatId(null); // düzenlenme kutusu kapatılır
      setEditingChatTitle(''); //input kapatılır.
      
      console.log('Chat title updated successfully:', chatId);
    } catch (error) {
      console.error('Update chat title error:', error);
      setError('Sohbet başlığı güncellenemedi.');
    }
  };

  const handleLogout = async () => { // logout butonuna basınca
    try {
      console.log('Logging out...');
      
      // Backend'e logout isteği gönder 
      const response = await api.logout(); //await olur çünkü önce bu işlem gerçekleşmesi gerek. servera çıkıp yap çağrısı gönderilir. 
      console.log('Logout response:', response);
      
      // State'i temizle
      setIsAuthenticated(false); //auth sıfırlanır.artık giriş yapılmamış gibi 
      setCurrentUser(null); //curren user null olur
      setChats([]); //chat sıfrılanır
      setCurrentChatId(null); //seçili sohbet sıfırlanır.
      setMessages([]); //mesajlar silinir.
      setError(null); //hata mesajları temizlenir.
      
      // localStorage'ı temizle
      localStorage.removeItem(CHATS_KEY); 
      localStorage.removeItem(CURRENT_CHAT_KEY); //Tarayıcının kalıcı hafızasında tutulan sohbetler de silinir.
     
      navigate('/login'); //navigate fonksiyonuyla kullanıcı giriş ekranına gönderilir.
    } catch (error) {
      console.error('Logout error:', error);
      // Hata olsa bile state'i temizle
      setIsAuthenticated(false);
      setCurrentUser(null);
      setChats([]);
      setCurrentChatId(null);
      setMessages([]);
      setError(null);
      
      // localStorage'ı temizle
      localStorage.removeItem(CHATS_KEY);
      localStorage.removeItem(CURRENT_CHAT_KEY);
      
      navigate('/login');
    }
  };

  const translations = {
    en: {
      newChat: 'New Chat',
      typeMessage: 'Type your message...',
      send: 'Send',
      logout: 'Logout',
      darkMode: 'Dark Mode',
      language: 'Language',
      delete: 'Delete',
      welcome: 'Welcome to AI Chatbot!',
      startChat: 'Create a new chat to start conversation.',
      error: 'Error',
      login: 'Login',
      register: 'Register',
      aiModel: 'AI Model',
      selectLanguage: 'Select Language'
    },
    tr: {
      newChat: 'Yeni Sohbet',
      typeMessage: 'Mesajınızı yazın...',
      send: 'Gönder',
      logout: 'Çıkış',
      darkMode: 'Karanlık Mod',
      language: 'Dil',
      delete: 'Sil',
      welcome: 'AI Chatbot\'a Hoş Geldiniz!',
      startChat: 'Sohbete başlamak için yeni bir chat oluşturun.',
      error: 'Hata',
      login: 'Giriş Yap',
      register: 'Kayıt Ol',
      aiModel: 'AI Modeli',
      selectLanguage: 'Dil Seçin'
    },
    de: {
      newChat: 'Neuer Chat',
      typeMessage: 'Nachricht eingeben...',
      send: 'Senden',
      logout: 'Abmelden',
      darkMode: 'Dunkler Modus',
      language: 'Sprache',
      delete: 'Löschen',
      welcome: 'Willkommen beim AI Chatbot!',
      startChat: 'Erstellen Sie einen neuen Chat, um zu beginnen.',
      error: 'Fehler',
      login: 'Anmelden',
      register: 'Registrieren',
      aiModel: 'KI-Modell',
      selectLanguage: 'Sprache auswählen'
    },
    fr: {
      newChat: 'Nouveau Chat',
      typeMessage: 'Tapez votre message...',
      send: 'Envoyer',
      logout: 'Déconnexion',
      darkMode: 'Mode Sombre',
      language: 'Langue',
      delete: 'Supprimer',
      welcome: 'Bienvenue sur AI Chatbot!',
      startChat: 'Créez un nouveau chat pour commencer.',
      error: 'Erreur',
      login: 'Connexion',
      register: 'S\'inscrire',
      aiModel: 'Modèle IA',
      selectLanguage: 'Sélectionner la langue'
    },
    es: {
      newChat: 'Nuevo Chat',
      typeMessage: 'Escribe tu mensaje...',
      send: 'Enviar',
      logout: 'Cerrar Sesión',
      darkMode: 'Modo Oscuro',
      language: 'Idioma',
      delete: 'Eliminar',
      welcome: '¡Bienvenido a AI Chatbot!',
      startChat: 'Crea un nuevo chat para comenzar.',
      error: 'Error',
      login: 'Iniciar Sesión',
      register: 'Registrarse',
      aiModel: 'Modelo IA',
      selectLanguage: 'Seleccionar Idioma'
    }
  };

  const t = translations[language];
  const location = useLocation();

  // Giriş yapmamış kullanıcıları login sayfasına yönlendir
  useEffect(() => { //useEffect(...) sayfa her render olduğunda veya isAuthenticated, location.pathname, ya da navigate değiştiğinde çalışır.
    if (!isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register') { //eğer kullanıcı giriş yapmadıysa veya login,register sayfasında değilse zorla login sayfasına atılır. 
      navigate('/login');
    }
  }, [isAuthenticated, location.pathname, navigate]);

  if (location.pathname === '/login') { //eper kullanıcı login sayfasındaysa
    return <Login onLogin={handleLogin} error={error} isLoading={isLoading} />; //login butonuna basınca çalışacak olan fonksyion onLogin=handleLogin,eğer bir hata varsa error syaesinde gözüküyr ve giriş ypaılıyor ibaresi isLoading syesinde belli olur.
  }
  if (location.pathname === '/register') {
    return <Register onRegister={handleRegister} error={error} isLoading={isLoading} />; //App.js şu satırla regiser bileşenine 3 şey gönderiyor,render olması demek sayfada register formunun gözükmesi.

  }

  // Giriş yapmamış kullanıcılar için login sayfasını göster
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} error={error} isLoading={isLoading} />;
  }

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      <div className="chat-container">
        <div className="sidebar">
          <div className="sidebar-header">
            <h2>AI Chatbot</h2>
            <div className="user-info">
              {currentUser ? (
                <>
                  <span>Hoş geldin, {currentUser.username}!</span>
                  <button onClick={handleLogout} className="logout-btn">
                    {t.logout}
                  </button>
                </>
              ) : (
                <div className="auth-buttons">
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="login-btn"
                  >
                    {t.login}
                  </button>
                  <button
                    onClick={() => window.location.href = '/register'}
                    className="register-btn"
                  >
                    {t.register}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="controls">
            <button 
              onClick={createNewChat} 
              className="new-chat-btn"
              disabled={isLoading}
            >
              {t.newChat}
            </button>
            
             
            <div className="settings">
              <label>
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
                {t.darkMode}
              </label>
            </div>
          </div>

          <div className="chat-list">
            {chats.map(chat => (
              <div
                key={chat.id}
                className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
                onClick={() => selectChat(chat.id)}
              >
                {editingChatId === chat.id ? (
                  // Düzenleme modu
                  <div className="chat-edit-container">
                    <input
                      type="text"
                      value={editingChatTitle}
                      onChange={(e) => setEditingChatTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEditChatTitle(chat.id)}
                      className="chat-title-edit-input"
                      autoFocus
                    />
                    <div className="chat-edit-buttons">
                      <button
                        onClick={() => saveEditChatTitle(chat.id)}
                        className="save-chat-edit-btn"
                        disabled={isLoading}
                      >
                        ✓
                      </button>
                      <button
                        onClick={cancelEditChatTitle}
                        className="cancel-chat-edit-btn"
                        disabled={isLoading}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  // Normal görünüm
                  <>
                    <span className="chat-title">{chat.title}</span>
                    <div className="chat-item-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditChatTitle(chat.id, chat.title);
                        }}
                        className="edit-chat-btn"
                        title="Düzenle"
                      >
                        ✏️
                      </button>
                      {isAuthenticated && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(chat.id);
                          }}
                          className="delete-chat-btn"
                        >
                          {t.delete}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="main-chat">
          {error && (
            <div className="error-message">
              {t.error}: {error}
            </div>
          )}
          
          {currentChatId ? (
            <>
              <div className="messages-container">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}
                  >
                    {editingMessageId === message.id ? (
                      // Düzenleme modu
                      <div className="message-edit-container">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && saveEditMessage(message.id)}
                          className="message-edit-input"
                          autoFocus
                        />
                        <div className="message-edit-buttons">
                          <button
                            onClick={() => saveEditMessage(message.id)}
                            className="save-edit-btn"
                            disabled={isLoading}
                          >
                            Kaydet
                          </button>
                          <button
                            onClick={cancelEditMessage}
                            className="cancel-edit-btn"
                            disabled={isLoading}
                          >
                            İptal
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Normal görünüm
                      <>
                        <div className="message-content">
                          {message.text}
                          {message.originalText && message.originalText !== message.text && (
                            <div className="original-text">
                              <small>Orijinal: {message.originalText}</small>
                            </div>
                          )}
                        </div>
                        <div className="message-actions">
                          {message.sender === 'user' && (
                            <>
                              <button
                                onClick={() => startEditMessage(message.id, message.text)}
                                className="edit-message-btn"
                                title="Düzenle"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteMessage(message.id)}
                                className="delete-message-btn"
                                title="Sil"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                        <div className="message-time">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="message ai-message">
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="input-container">
                <div className="input-controls">
                <ModelSelector
                  selectedModel={selectedModel}
                  onModelChange={handleModelChange}
                  disabled={isLoading}
                  compact={true}
                />
                <LanguageSelector
                  selectedLanguage={language}
                  onLanguageChange={handleLanguageChange}
                  disabled={isLoading}
                  compact={true}
                />
                <HotelSelector
                  selectedHotel={selectedHotel}
                  onHotelChange={handleHotelChange}
                  disabled={isLoading}
                  compact={true}
                />
              </div>
                <div className="input-row">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder={t.typeMessage}
                    disabled={isLoading}
                    className="message-input"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="send-btn"
                  >
                    {t.send}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="welcome-message">
              <h3>{t.welcome}</h3>
              <p>{t.startChat}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AppContent />} />
        <Route path="/register" element={<AppContent />} />
        <Route path="/" element={<AppContent />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

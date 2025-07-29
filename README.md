# AI-Chatbot

## Proje Açıklaması

Bu proje, sıkça sorulan sorulara (FAQ) yanıt veren veya OpenRouter API üzerinden kullanıcılarla sohbet edebilen bir yapay zeka chatbot uygulamasıdır. Kullanıcılar, web arayüzü üzerinden sorularını yazabilir ve anında yanıt alabilirler.

## Kullanılan Teknolojiler

- **Node.js**: Sunucu tarafı geliştirme ve API entegrasyonu için.
- **HTML/CSS**: Web arayüzü tasarımı için.
- **OpenRouter API**: Yapay zeka sohbet ve yanıtlar için.

##Uygulamanın Özellikleri

- **Gerçek Zamanlı Yanıtlar**: Kullanıcının sorduğu sorulara, OpenRouter API üzerinden anında yanıt alınır.
- **Sohbet Oluşturma**: Yeni bir konuşma başlatılabilir ve sistem bu konuşmayı kayıt altına alır.
- **Sohbet Güncelleme**: Mevcut sohbetlerin başlıkları veya içerikleri istenirse düzenlenebilir.
- **Sohbet Silme**: Kullanıcılar, istemedikleri sohbet geçmişlerini silebilir.
- **Sıkça Sorulan Sorular (FAQ)**: Belirli konular için özelleştirilmiş yanıtlar sunularak chatbot'un bilgilendirici yönü güçlendirilir.
- **Kullanıcı Arayüzü**: HTML ve CSS ile oluşturulan sade, anlaşılır ve kullanıcı dostu bir arayüz mevcuttur.


## Fonksiyonel Gereksinimler

- Kullanıcı, web arayüzünden metin girerek mesaj gönderebilmelidir.
- Chatbot, kullanıcıdan gelen soruya anlamlı yanıtlar verebilmelidir.
- Sohbet ekranı, geçmiş mesajları gösterebilmelidir.
- Sıkça sorulan sorular için özel yanıtlar sunulabilir (Opsiyonel).

## Teknik Gereksinimler

- Web sunucusu Node.js ile çalışmalıdır.
- OpenRouter API ile entegre çalışarak gerçek zamanlı yanıt üretmelidir.
- Arayüz HTML/CSS ile oluşturulmalıdır.
- API anahtarı .env dosyasında gizli tutulmalıdır.

## Kurulum ve Kullanım

1. **Projeyi Klonlayın**
   
   git clone https://github.com/seherogz/AI-ChatBot.git
   cd AI-ChatBot
   

2. **Bağımlılıkları Yükleyin**
   npm install


3. **OpenRouter API Anahtarını Ekleyin**
   - `config.js` veya `.env` dosyasına OpenRouter API anahtarınızı ekleyin.

4. **Uygulamayı Başlatın**
   
   npm start
   
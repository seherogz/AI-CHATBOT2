const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');

// Database ve middleware import
const { syncDatabase, User } = require('./models');
const { generateToken, authenticateToken, optionalAuth } = require('./middleware/auth');

const app = express();

// CORS Ayarları:CORS ayarları frontend ile iletişimi sağlar, 
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.options('*', cors());

app.use(express.json());


// --- LOGLAMA MIDDLEWARE ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`); //req.method: HTTP metodu (GET, POST, PUT, DELETE), gelen istekleri loglar.
  if (req.body && Object.keys(req.body).length > 0) { //eğer varsa body ieriğini gösterir.
    console.log('Request Body:', req.body);
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Sunucu hatası oluştu',
    error: err.message
  });
});

// Ana sayfa
app.get('/', (req, res) => {
  res.json({ message: 'AI Chatbot API çalışıyor' }); //json formatında yanıt gönderir.
});

// --- AUTH ENDPOINTS ---

// Kullanıcı kaydı
app.post('/api/auth/register', async (req, res) => { //username, email, password kontrol edilir.Kullanıcı zaten varsa 400 dönerYeni kullanıcı oluşturulur (User.create)JWT token üretip döner
  try {
    const { username, email, password } = req.body; //bu bilgileri kullanıcı gönderiyor formdan.
    
    console.log('Register attempt:', { username, email });
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tüm alanlar zorunludur.' 
      });
    }
    
    const existingUser = await User.findOne({  // username veya emailiyle kullanıcı kontrol edilir.
      where: {
        [require('sequelize').Op.or]: [
          { username: username },
          { email: email }
        ]
      }
    });
    
    if (existingUser) { //kullanıcı varsa 400 döner.
      return res.status(400).json({ 
        success: false, 
        message: 'Bu kullanıcı adı veya email zaten kullanılıyor.' 
      });
    }
    
    // Yeni kullanıcı oluştur
    const user = await User.create({
      username,
      email,
      password
    });
    
    // JWT token oluştur
    const token = generateToken(user);
    
    console.log('User registered successfully:', { id: user.id, username: user.username });
    
    res.status(201).json({ 
      success: true, 
      message: 'Kayıt başarılı.',
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email 
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kayıt sırasında hata oluştu.' 
    });
  }
});

// Kullanıcı girişi
//Kullanıcının gönderdiği username ve password bilgilerine göre:
//Kullanıcının var olup olmadığını kontrol eder
//Şifresinin doğru olup olmadığını bcrypt ile kontrol eder
//Doğruysa JWT token oluşturup kullanıcıya döner
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body; //kullanıcının gönderdiği username ve password bilgileri alınır.
     
    console.log('Login attempt:', { username });
    
    if (!username || !password) { //username ve password zorunlu alanlar kontrol edilir. eksikse 400 döner.
      return res.status(400).json({ 
        success: false, 
        message: 'Kullanıcı adı ve şifre zorunludur.' 
      });
    }
    
    // Kullanıcıyı bul
    const user = await User.findOne({ 
      where: { username: username }
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı adı veya şifre hatalı.' 
      });
    }
    
    // Şifre kontrolü
    const isValidPassword = await bcrypt.compare(password, user.password); //kullanıcının gönderdiği password (bcrypt) veritabanındaki hashlenmiş password ile karşılaştırılır.
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı adı veya şifre hatalı.' 
      });
    }
    
    // JWT token oluştur
    const token = generateToken(user);
    
    console.log('User logged in successfully:', { id: user.id, username: user.username });
    
    res.status(200).json({  //kullanıcı giriş yaptıktan sonra token oluşturulur ve kullanıcıya döner bu bilgiler.
      success: true, 
      message: 'Giriş başarılı.',
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email 
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Giriş sırasında hata oluştu.' 
    });
  }
});

// Kullanıcı profili
app.get('/api/auth/profile', authenticateToken, async (req, res) => { //Bu sayede sadece giriş yapmış kullanıcılar profiline erişebilir.
  try {
    res.status(200).json({ 
      success: true,
      user: { //token geçerliyse veya kullanıcı bulunduysa bu bilgiler json formatında gözükür.
        id: req.user.id, //id bilgisi req.user.id'nin içine konur.
        username: req.user.username,
        email: req.user.email,
        preferredModel: req.user.preferredModel || 'openai/gpt-3.5-turbo',
        preferredLanguage: req.user.preferredLanguage || 'tr'
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({  //hatalıysa 500 döner.
      success: false,
      message: 'Profil bilgileri alınırken hata oluştu.'
    });
  }
});

// Kullanıcı çıkışı
app.post('/api/auth/logout', authenticateToken, async (req, res) => { //Sadece token’ı olan (giriş yapmış) kullanıcı çıkış yapabilir.
  try {
    console.log('User logout:', { id: req.user.id, username: req.user.username });
    
    //  Önce token doğrulaması yapılır.Token doğruysa çıkış yapılır. Token doğru değilse 401 döner.
    res.status(200).json({ //token doğprulaması yapılır önce
      success: true,
      message: 'Çıkış başarılı.'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Çıkış sırasında hata oluştu.'
    });
  }
});

// Kullanıcı tercihlerini güncelle
app.post('/api/user/preferences', authenticateToken, async (req, res) => { //Sadece token’ı olan (giriş yapmış) kullanıcı tercihlerini güncelleyebilir.
  try {
    const { model, language } = req.body;  //kullanıcının gönderdiği model ve language bilgileri alınır.
    
    console.log('Updating user preferences:', {  
      userId: req.user.id, 
      username: req.user.username, 
      model, 
      language 
    });
    
    // Kullanıcı tercihlerini güncelle
    await User.update(
      { 
        preferredModel: model, 
        preferredLanguage: language 
      },
      { where: { id: req.user.id } } //Hangi kullanıcının tercihlerini güncelleyeceğini belirtir.
    );
    
    res.status(200).json({
      success: true,
      message: 'Tercihler güncellendi.',
      preferences: { model, language }
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Tercihler güncellenirken hata oluştu.'
    });
  }
});

// --- OTELLER VERİSİ ---
const hotels = [
  {
    "id": 1,
    "name": "Grand Sunrise Hotel",
    "location": "Antalya",
    "price": 1800,
    "stars": 5,
    "features": ["denize sıfır", "spa", "her şey dahil"]
  },
  {
    "id": 2,
    "name": "Mountain Breeze Resort",
    "location": "Bolu",
    "price": 950,
    "stars": 4,
    "features": ["orman manzaralı", "kahvaltı dahil", "doğa yürüyüşleri"]
  },
  {
    "id": 3,
    "name": "Urban Stay Hotel",
    "location": "İstanbul",
    "price": 1200,
    "stars": 3,
    "features": ["merkezde", "ücretsiz Wi-Fi", "kahvaltı"]
  },
  {
    "id": 4,
    "name": "Sahil Tatil Köyü",
    "location": "İzmir",
    "price": 1500,
    "stars": 4,
    "features": ["havuz", "plaja yakın", "animasyon"]
  },
  {
    "id": 5,
    "name": "Kapadokya Mağara Hotel",
    "location": "Nevşehir",
    "price": 2000,
    "stars": 5,
    "features": ["mağara odalar", "balon turu", "manzara"]
  },
  {
    "id": 6,
    "name": "Bodrum Palace Resort",
    "location": "Muğla",
    "price": 2200,
    "stars": 5,
    "features": ["özel plaj", "infinity havuz", "spa merkezi"]
  },
  {
    "id": 7,
    "name": "Trabzon Sahil Hotel",
    "location": "Trabzon",
    "price": 1100,
    "stars": 4,
    "features": ["deniz manzaralı", "yerel mutfak", "organik kahvaltı"]
  },
  {
    "id": 8,
    "name": "Konya Selçuklu Hotel",
    "location": "Konya",
    "price": 800,
    "stars": 3,
    "features": ["tarihi merkez", "Mevlana müzesi yakın", "geleneksel mutfak"]
  },
  {
    "id": 9,
    "name": "Gaziantep Zeugma Hotel",
    "location": "Gaziantep",
    "price": 900,
    "stars": 4,
    "features": ["mutfak müzesi yakın", "baklava atölyesi", "tarihi çarşı"]
  },
  {
    "id": 10,
    "name": "Van Gölü Resort",
    "location": "Van",
    "price": 1300,
    "stars": 4,
    "features": ["göl manzaralı", "kahvaltı dahil", "doğa turları"]
  },
  {
    "id": 11,
    "name": "Diyarbakır Sur Hotel",
    "location": "Diyarbakır",
    "price": 750,
    "stars": 3,
    "features": ["surlar yakın", "tarihi merkez", "geleneksel mutfak"]
  },
  {
    "id": 12,
    "name": "Erzurum Palandöken Hotel",
    "location": "Erzurum",
    "price": 1600,
    "stars": 4,
    "features": ["kayak merkezi", "termal havuz", "dağ manzarası"]
  },
  {
    "id": 13,
    "name": "Samsun Karadeniz Hotel",
    "location": "Samsun",
    "price": 950,
    "stars": 3,
    "features": ["deniz manzaralı", "Atatürk müzesi yakın", "yerel lezzetler"]
  },
  {
    "id": 14,
    "name": "Adana Seyhan Hotel",
    "location": "Adana",
    "price": 850,
    "stars": 3,
    "features": ["merkezi konum", "kebap restoranı", "Seyhan barajı manzarası"]
  },
  {
    "id": 15,
    "name": "Mersin Marina Hotel",
    "location": "Mersin",
    "price": 1200,
    "stars": 4,
    "features": ["marina manzaralı", "deniz ürünleri", "modern tasarım"]
  },
  {
    "id": 16,
    "name": "Bursa Uludağ Resort",
    "location": "Bursa",
    "price": 1400,
    "stars": 4,
    "features": ["kayak merkezi", "termal kaynaklar", "yeşil doğa"]
  },
  {
    "id": 17,
    "name": "Eskişehir Porsuk Hotel",
    "location": "Eskişehir",
    "price": 1000,
    "stars": 3,
    "features": ["Porsuk çayı manzarası", "üniversite şehri", "modern sanat"]
  },
  {
    "id": 18,
    "name": "Kayseri Erciyes Hotel",
    "location": "Kayseri",
    "price": 1100,
    "stars": 4,
    "features": ["kayak merkezi", "pastırma lezzetleri", "tarihi merkez"]
  },
  {
    "id": 19,
    "name": "Malatya Kayısı Hotel",
    "location": "Malatya",
    "price": 700,
    "stars": 3,
    "features": ["kayısı bahçeleri", "geleneksel mutfak", "doğa yürüyüşleri"]
  },
  {
    "id": 20,
    "name": "Elazığ Hazar Hotel",
    "location": "Elazığ",
    "price": 800,
    "stars": 3,
    "features": ["Hazar gölü manzarası", "yerel mutfak", "tarihi geziler"]
  }
];

// --- OTELLER API ENDPOINT'LERİ ---

// Tüm otelleri getir
app.get('/api/hotels', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      hotels: hotels
    });
  } catch (error) {
    console.error('Get hotels error:', error);
    res.status(500).json({
      success: false,
      message: 'Otel bilgileri alınırken hata oluştu.'
    });
  }
});

// Konuma göre otel ara
app.get('/api/hotels/search', (req, res) => {
  try {
    const { location, maxPrice, minPrice, stars } = req.query;
    
    let filteredHotels = [...hotels];
    
    // Konum filtresi
    if (location) {
      filteredHotels = filteredHotels.filter(hotel => 
        hotel.location.toLowerCase().includes(location.toLowerCase())
      );
    }
    
    // Fiyat filtresi
    if (maxPrice) {
      filteredHotels = filteredHotels.filter(hotel => 
        hotel.price <= parseInt(maxPrice)
      );
    }
    
    if (minPrice) {
      filteredHotels = filteredHotels.filter(hotel => 
        hotel.price >= parseInt(minPrice)
      );
    }
    
    // Yıldız filtresi
    if (stars) {
      filteredHotels = filteredHotels.filter(hotel => 
        hotel.stars >= parseInt(stars)
      );
    }
    
    res.status(200).json({
      success: true,
      hotels: filteredHotels,
      count: filteredHotels.length
    });
  } catch (error) {
    console.error('Search hotels error:', error);
    res.status(500).json({
      success: false,
      message: 'Otel arama sırasında hata oluştu.'
    });
  }
});

// --- SUNUCUYU BAŞLATMA ---
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Database'i senkronize et
    await syncDatabase();
    
    // Sunucuyu başlat
    app.listen(PORT, () => {
      console.log(`Backend sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer(); 
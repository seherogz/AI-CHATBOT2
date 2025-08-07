const jwt = require('jsonwebtoken');
const { User } = require('../models');

// JWT Token oluşturma
const generateToken = (user) => { //Bu fonksiyon bir kullanıcı için JWT token oluştur
  return jwt.sign( //tokenin içeriğine eklenen payloadlar.
    { 
      id: user.id, 
      username: user.username, 
      email: user.email 
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// kullanıcının gönderdiği JWT token'ı doğrular. 
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']; //Header’dan Authorization bilgisi alınır. auth= bearer token.. bearer tokenı alır req.header
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN,ssdece token alır. bearer'i atar.

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); //token çözümlenir,payload kısmı çıkarılır.
    const user = await User.findByPk(decoded.id); //token içinden gelen id ile veritabınından o kullanıcı bulunur.

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or inactive user' 
      });
    }

    req.user = user; //kullanıcı bilgisi req.user içine yerleştirilir eğer token geçerliyse
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// Opsiyonel authentication middleware (giriş yapmamış kullanıcılar için)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Token geçersizse kullanıcıyı anonim olarak devam ettir
    next();
  }
};

module.exports = { //dışa katarırım.
  generateToken,
  authenticateToken,
  optionalAuth
}; 
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import nodemailer from 'nodemailer';


const app = express();
app.use(express.json());

app.use(cors());
app.use(express.static('public'));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) console.error('MySQL connect error:', err);
  else console.log('MySQL connected');
});

const transporter= nodemailer.createTransport({
    service: 'gmail',
    auth:{
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});


app.post('/register', (req, res) => {
  console.log('Register body:', req.body);
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  const q = 'INSERT INTO user(`Username`, `Email`, `Password`) VALUES(?,?,?)';
  db.query(q, [username, email, password], (error, result) => {
    if (error) {
      console.error('DB insert error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const mailOptions={
        from:'bakryara11@gmail.com',
        to :email,
        subject:'Welcome to wasset!',
        html:`
        <h2>welcome ${username}!</h2>
        <p>Your account has been created succesfuly.</p>
        <p>Email: ${email}</p>
        <a href="${process.env.FRONTEND_URL}/login">Click here to login</a>

     
     `
    };

    transporter.sendMail(mailOptions,(err, info)=>{
        if(err) console.error('Email error:' , err);
        else console.log('Email sent:', info.response);
    });
   return res.json({ success: true, id: result.insertId });
  });
});
  
app.post('/login', (req, res) => {
  console.log('Login body:', req.body);
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  const q = 'SELECT * FROM user WHERE `Email` = ?';
  db.query(q, [email], (err, data) => {
    if (err) {
      console.error('DB select error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!data || data.length === 0) return res.status(404).json({ error: 'Email not found' });

    const dbPassword = data[0].Password ?? data[0].password;
    if (dbPassword === undefined) {
      console.warn('Password column missing in query result:', data[0]);
      return res.status(500).json({ error: 'Server error' });
    }

    if (password === dbPassword) return res.json({ success: true, status: 'Success' });
    return res.status(401).json({ error: 'Wrong password' });
  });
});


app.put('/user/password', (req, res) => {
  console.log('Update password:', req.body);
  const { email, oldPassword, newPassword } = req.body;
  if (!email || !oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });

  const q = 'UPDATE user SET `Password` = ? WHERE `Email` = ? AND `Password` = ?';
  db.query(q, [newPassword, email, oldPassword], (err, result) => {
    if (err) {
      console.error('DB update error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.affectedRows === 0) return res.status(401).json({ error: 'Old password incorrect' });
    return res.json({ success: true, message: 'Password updated' });
  });
});

const PORT = process.env.PORT || 3000;   
app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const port = 3000;

// In-memory storage for submissions (replace with database in production)
const submissions = [];

// CSRF token storage (in-memory for simplicity; use session store in production)
const csrfTokens = new Set();

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files (e.g., index.html)
app.use(express.static('.'));

// Nodemailer transporter configuration (using Gmail; replace with your email service)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail address (e.g., 'your.email@gmail.com')
        pass: process.env.EMAIL_PASS  // Your Gmail App Password (not regular password)
    }
});

// Generate CSRF token
app.get('/api/csrf-token', (req, res) => {
    const token = crypto.randomBytes(32).toString('hex');
    csrfTokens.add(token);
    res.json({ csrfToken: token });
});

// Handle contact form submission
app.post('/api/contact', async (req, res) => {
    const { name, email, phone, message, _csrf } = req.body;

    // Validate CSRF token
    if (!_csrf || !csrfTokens.has(_csrf)) {
        return res.status(403).json({ message: 'Invalid CSRF token' });
    }
    csrfTokens.delete(_csrf); // Remove token after use (one-time use)

    // Basic server-side validation
    if (!name || !email || !phone || !message) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email address' });
    }

    // Store submission (replace with database save in production)
    const submission = { name, email, phone, message, timestamp: new Date() };
    submissions.push(submission);

    // Send email notification
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: '[Your Company Email]', // Replace with your recipient email
            subject: `New Contact Form Submission from ${name}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                <p><strong>Message:</strong> ${message}</p>
                <p><strong>Submitted:</strong> ${submission.timestamp.toISOString()}</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', { name, email, phone, message });

        // Send success response
        res.status(200).json({ message: 'Submission received successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Submission saved, but failed to send email notification' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
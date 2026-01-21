import React from 'react';
import Contact from '../components/Contact/Contact';
import './ContactPage.css';

const ContactPage = () => {
  return (
    <div className="contact-page">
      <div className="page-container">
        <h1 className="page-title">Contact Support</h1>
        <p className="page-subtitle">Send inquiries or feedback directly to our support team.</p>
        <Contact />
      </div>
    </div>
  );
};

export default ContactPage;

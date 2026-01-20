import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Lock, Eye, Zap, ArrowRight, Play } from 'lucide-react';
import './Hero.css';

const Hero = () => {
  const { t } = useTranslation();
  const heroRef = useRef(null);
  const particlesRef = useRef(null);
  const navigate = useNavigate();

  const handleStartScan = () => {
    navigate('/app');
  };

  const handleWatchDemo = () => {
    // You can add demo functionality here or navigate to a demo page
    navigate('/app');
  };

  useEffect(() => {
    // GSAP Animations
    const tl = gsap.timeline();

    // Animate floating particles
    gsap.set('.particle', {
      opacity: 0,
      scale: 0
    });

    gsap.to('.particle', {
      opacity: 1,
      scale: 1,
      duration: 2,
      stagger: 0.1,
      repeat: -1,
      yoyo: true,
      ease: 'power2.inOut'
    });

    // Floating animation for particles
    gsap.to('.particle', {
      y: -20,
      duration: 3,
      repeat: -1,
      yoyo: true,
      stagger: 0.2,
      ease: 'sine.inOut'
    });

    // Security shield rotation
    gsap.to('.hero-shield', {
      rotation: 360,
      duration: 20,
      repeat: -1,
      ease: 'none'
    });

  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  return (
    <section id="home" className="hero" ref={heroRef}>
      {/* Animated Background */}
      <div className="hero-bg">
        <div className="gradient-overlay"></div>
        <div className="particles" ref={particlesRef}>
          {[...Array(20)].map((_, i) => (
            <div key={i} className={`particle particle-${i + 1}`}></div>
          ))}
        </div>
      </div>

      <div className="container">
        <motion.div
          className="hero-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="hero-badge" variants={itemVariants}>
            <Zap size={16} />
            <span>Your Digital Security Guardian</span>
          </motion.div>

          <motion.h1 className="hero-title" variants={itemVariants}>
            {t('hero.title')}
          </motion.h1>

          <motion.p className="hero-description" variants={itemVariants}>
            {t('hero.subtitle')}
          </motion.p>

          <motion.div className="hero-actions" variants={itemVariants}>
            <motion.button
              className="btn btn-primary hero-cta"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartScan}
            >
              {t('hero.cta')}
              <ArrowRight size={20} />
            </motion.button>

            <motion.button
              className="btn btn-outline hero-demo"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleWatchDemo}
            >
              <Play size={20} />
              {t('hero.secondaryCta')}
            </motion.button>
          </motion.div>

          <motion.div className="hero-trust" variants={itemVariants}>
            <p>Trusted by security professionals worldwide</p>
            <div className="trust-badges">
              <div className="trust-badge">SOC 2 Certified</div>
              <div className="trust-badge">GDPR Compliant</div>
              <div className="trust-badge">ISO 27001</div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-visual"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="security-dashboard">
            <div className="hero-shield">
              <Shield size={80} />
            </div>
            <div className="dashboard-elements">
              <div className="element element-1">
                <div className="pulse"></div>
                Gmail
              </div>
              <div className="element element-2">
                <div className="pulse"></div>
                GitHub
              </div>
              <div className="element element-3">
                <div className="pulse"></div>
                Slack
              </div>
              <div className="element element-4">
                <div className="pulse"></div>
                Microsoft
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="scroll-indicator"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="scroll-line"></div>
      </motion.div>
    </section>
  );
};

export default Hero;

import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black text-white font-space">
      <Navbar />

      <header className="relative pt-28 pb-12 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-6 leading-tight"
            style={{ textShadow: '0 0 20px rgba(0, 0, 0, 0.8)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Terms of Service
          </motion.h1>
          <motion.p
            className="mt-4 text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed font-light max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Please read these Terms of Service carefully before using WorldLore. By accessing or using our services, you agree to be bound by these terms.
          </motion.p>
        </div>
      </header>

      <main className="px-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-10">
          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              By using WorldLore, you confirm that you have read, understood, and agree to these Terms of Service and our Privacy Policy. If you do not agree, you may not use the services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">2. Description of Service</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              WorldLore provides AI-assisted analysis, educational content, and interactive visualizations. Certain features may be labeled as “Beta” or “Coming Soon” and may change without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">3. User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2 text-white/90 font-light text-lg md:text-xl">
              <li>Provide accurate information when creating an account or using our services.</li>
              <li>Use the services in compliance with applicable laws.</li>
              <li>Do not misuse the platform, including attempts to disrupt, reverse engineer, or unauthorizedly access our systems.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">4. Intellectual Property</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              All content, trademarks, logos, and software related to WorldLore are owned by WorldLore or its licensors and are protected by intellectual property laws. You may not copy, modify, or distribute materials without permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">5. Disclaimers</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              The services are provided "as is" and "as available" without warranties of any kind. We make no guarantees regarding the accuracy, completeness, or reliability of information provided by the platform or AI outputs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">6. Limitation of Liability</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              To the maximum extent permitted by law, WorldLore and its affiliates will not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">7. Termination</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              We may suspend or terminate your access to the services at any time if you violate these Terms or if required by law. Upon termination, your right to use the services will cease immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">8. Changes to the Terms</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              We may modify these Terms from time to time. We will post the updated version with a new “Last Updated” date. Continued use of the services after changes means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">9. Governing Law</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              These Terms will be governed by and construed in accordance with the laws applicable in your jurisdiction, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">10. Contact</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              If you have any questions about these Terms, please contact us at
              <span className="text-cyan-300"> support@worldlore.ai</span>.
            </p>
          </section>

          <div className="text-white/60 text-sm">Last Updated: Mar 2025</div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
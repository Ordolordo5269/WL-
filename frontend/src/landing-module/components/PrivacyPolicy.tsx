import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';

export default function PrivacyPolicy() {
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
            Privacy Policy
          </motion.h1>
          <motion.p
            className="mt-4 text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed font-light max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Your privacy is important to us. This policy explains what data we collect, how we use it, and your rights.
          </motion.p>
        </div>
      </header>

      <main className="px-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-10">
          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">1. Information We Collect</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              We may collect information you provide directly (such as name, email, and communications) and technical data
              generated when you use our services (such as device, browser, IP address, and usage analytics). Some features
              may require additional information to operate correctly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-white/90 font-light text-lg md:text-xl">
              <li>Provide, maintain, and improve our products and services.</li>
              <li>Personalize experiences and deliver relevant content.</li>
              <li>Monitor performance, prevent abuse, and enhance security.</li>
              <li>Communicate updates, support, and marketing (where permitted).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">3. Sharing and Disclosure</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              We do not sell your personal information. We may share data with trusted service providers who process it on
              our behalf, following strict confidentiality and security obligations, or when required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">4. Data Security</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              We implement technical and organizational measures designed to protect your data. However, no method of
              transmission over the internet or electronic storage is completely secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">5. Your Rights</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              Depending on your location, you may have rights to access, correct, delete, restrict, or object to the
              processing of your personal data. You may also have the right to data portability. To exercise these rights,
              contact us using the details below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">6. Children’s Privacy</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              Our services are not directed to children under 13 (or higher age as required by local law). We do not
              knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">7. Changes to This Policy</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              We may update this policy from time to time. We will post the revised version with an updated “Last Updated”
              date. Continued use of our services after changes means you accept the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">8. Contact Us</h2>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
              If you have questions or requests regarding this policy, please contact us at
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
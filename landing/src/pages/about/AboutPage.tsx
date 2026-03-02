import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white font-space">
      <Navbar />
      
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 z-10" />
          
          {/* Placeholder for founders photo */}
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
            {/* Mouse icon removed as requested */}
          </div>
        </div>

        <div className="relative z-20 max-w-6xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-white text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-light tracking-tight leading-[1.1] mb-8">
              Meet the Founders
            </h1>
            
            <motion.p
              className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Visionaries behind the future of global mobility and investment intelligence
            </motion.p>
          </motion.div>

          {/* Scroll indicator removed as requested */}
        </div>
      </section>

      <section className="relative py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-white text-3xl md:text-4xl lg:text-5xl font-light tracking-tight leading-[1.1] mb-8">
              Our Vision
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mb-8" />
          </motion.div>

          <div className="text-center">
            <motion.div
              className="space-y-6 max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="text-white text-2xl md:text-3xl font-light tracking-tight leading-[1.1] mb-8">
                Empowering Global Citizens Through Intelligent Technology
              </h3>
              
              <p className="text-lg text-gray-300 leading-relaxed max-w-4xl mx-auto mb-6">
                At WorldLore, we believe in a future where technology removes geographical barriers 
                and democratizes access to global opportunities. Our vision is to create an intelligent 
                ecosystem that connects people with the best opportunities for mobility, investment, 
                and global awareness through real-time insights on countries, economies, and conflicts 
                around the world.
              </p>
              
              <p className="text-lg text-gray-300 leading-relaxed max-w-4xl mx-auto mb-8">
                Through advanced artificial intelligence and real-time data analysis, we are building 
                tools that not only inform, but empower individuals and organizations to make smarter, 
                data-driven decisions about their global future.
              </p>

              <div className="flex flex-wrap gap-4 mt-8 justify-center">
                <motion.div
                  className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full border border-purple-500/30"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-purple-300 font-medium">AI-Powered</span>
                </motion.div>
                <motion.div
                  className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-500/30"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-blue-300 font-medium">Global Reach</span>
                </motion.div>
                <motion.div
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full border border-cyan-500/30"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-cyan-300 font-medium">Real-time Data</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

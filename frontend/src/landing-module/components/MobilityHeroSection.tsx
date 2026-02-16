import { memo, useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Feature Badge Component
const FeatureBadge = memo(({ icon, text, delay }: { icon: string; text: string; delay: number }) => (
  <motion.div
    className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 hover:bg-white/10 transition-all duration-300"
    initial={{ opacity: 0, y: 20, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
    whileHover={{ scale: 1.05, y: -2 }}
  >
    <span className="text-2xl">{icon}</span>
    <span className="text-white/90 font-medium text-sm md:text-base">{text}</span>
  </motion.div>
));

FeatureBadge.displayName = 'FeatureBadge';

// Advanced Mobility Dashboard Component
const MobilityDashboard = memo(() => {
  const [currentRoute, setCurrentRoute] = useState(0);
  const [countriesAnalyzed, setCountriesAnalyzed] = useState(195);
  const [dataPoints, setDataPoints] = useState(2847);
  const [accuracyRate, setAccuracyRate] = useState(97.3);
  
  // Dynamic mobility trends data
  const [mobilityTrends, setMobilityTrends] = useState([
    { label: 'Digital Nomad', value: 78, color: 'bg-green-400', trend: '+12%', baseValue: 78 },
    { label: 'Work Permits', value: 65, color: 'bg-blue-400', trend: '+8%', baseValue: 65 },
    { label: 'Student Visas', value: 82, color: 'bg-purple-400', trend: '+15%', baseValue: 82 },
    { label: 'Investment', value: 45, color: 'bg-yellow-400', trend: '+5%', baseValue: 45 }
  ]);
  
  const routes = [
    { 
      from: 'Spain', 
      to: 'Portugal', 
      requirement: 'EU Freedom of Movement', 
      cost: '€1,200/mo',
      requirements: {
        'Destination Analysis': 'Complete',
        'Visa': 'Not Required',
        'Documentation': 'ID Card Only',
        'Job Matching': 'Active'
      }
    },
    { 
      from: 'USA', 
      to: 'Estonia', 
      requirement: 'Digital Nomad Visa', 
      cost: '€1,800/mo',
      requirements: {
        'Destination Analysis': 'Complete',
        'Visa': 'Required',
        'Documentation': 'Collecting',
        'Job Matching': 'Searching'
      }
    },
    { 
      from: 'Brazil', 
      to: 'Germany', 
      requirement: 'Work Permit Required', 
      cost: '€2,400/mo',
      requirements: {
        'Destination Analysis': 'Updated',
        'Visa': 'Requirements Found',
        'Documentation': 'Analyzing',
        'Job Matching': 'Matching'
      }
    },
    { 
      from: 'Mexico', 
      to: 'Netherlands', 
      requirement: 'Student Visa', 
      cost: '€2,100/mo',
      requirements: {
        'Destination Analysis': 'Complete',
        'Visa': 'Checking Requirements',
        'Documentation': 'Identified',
        'Job Matching': 'Found Matches'
      }
    }
  ];

  // Dynamic requirements data
  const [requirements, setRequirements] = useState([
    { type: 'Destination Analysis', status: 'Complete', color: '#10b981' },
    { type: 'Visa', status: 'Required', color: '#f59e0b' },
    { type: 'Documentation', status: 'Analyzing', color: '#3b82f6' },
    { type: 'Job Matching', status: 'Searching', color: '#f59e0b' }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentRoute((prev) => {
        const newRoute = (prev + 1) % routes.length;
        
        // Update requirements status based on new route
        setRequirements(prevReq => prevReq.map(req => {
          const colors: Record<string, string> = {
            'Complete': '#10b981', 'Analyzing': '#3b82f6', 'Updated': '#10b981',
            'Required': '#ef4444', 'Not Required': '#10b981', 'Checking Requirements': '#3b82f6', 'Requirements Found': '#10b981',
            'Identified': '#10b981', 'Collecting': '#f59e0b', 'ID Card Only': '#10b981', 'Searching': '#f59e0b',
            'Matching': '#3b82f6', 'Found Matches': '#10b981', 'Active': '#10b981'
          };
          
          // Get status from new route
          const currentRouteData = routes[newRoute];
          const newStatus = currentRouteData.requirements[req.type as keyof typeof currentRouteData.requirements] || req.status;
          
          return {
            ...req,
            status: newStatus,
            color: colors[newStatus] || '#f59e0b'
          };
        }));
        
        return newRoute;
      });
      
      // Update main metrics
       setCountriesAnalyzed(prev => Math.min(195, prev + Math.floor(Math.random() * 2)));
       setDataPoints(prev => prev + Math.floor(Math.random() * 15 + 5));
       setAccuracyRate(prev => {
         const newValue = prev + (Math.random() > 0.5 ? 0.1 : -0.1);
         return Math.round(Math.min(99, Math.max(95, newValue)) * 10) / 10; // Round to 1 decimal
       });
      
      // Update mobility trends with realistic fluctuations
       setMobilityTrends(prev => prev.map(trend => {
         const fluctuation = (Math.random() - 0.5) * 4; // ±2% fluctuation
         const newValue = Math.max(20, Math.min(95, trend.baseValue + fluctuation));
         const trendChange = newValue > trend.value ? '+' : '';
         const trendValue = Math.abs(newValue - trend.baseValue).toFixed(0);
         
         return {
           ...trend,
           value: Math.round(newValue),
           trend: `${trendChange}${trendValue}%`
         };
       }));
     }, 4000); // Update every 4 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full relative">
      {/* Main Dashboard Container */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-purple-900/30 to-blue-900/40 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden">
        
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-purple-400 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 3,
                }}
              />
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="relative z-10 p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-white font-semibold text-lg mb-1">AI Mobility Dashboard</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-blue-400 text-sm font-medium">Sample Data</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-white">{countriesAnalyzed}</div>
                <div className="text-green-400 text-xs font-semibold">Countries Analyzed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">{dataPoints.toLocaleString()}</div>
                <div className="text-blue-400 text-xs font-semibold">Data Points</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">{accuracyRate}%</div>
                <div className="text-purple-400 text-xs font-semibold">AI Accuracy</div>
              </div>
            </div>
          </div>

          {/* AI Mobility Recommendations */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-xs font-medium">AI RECOMMENDATIONS</span>
                <span className="text-xs bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded border border-green-400/30">
                  Live
                </span>
              </div>
              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full border border-green-400/30">
                AI Powered
              </span>
            </div>
            <motion.div
              key={currentRoute}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="text-white font-semibold text-sm">{routes[currentRoute].from}</div>
              <div className="flex-1 flex items-center gap-2">
                <div className="h-0.5 bg-gradient-to-r from-green-400 to-blue-400 flex-1 rounded"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <div className="h-0.5 bg-gradient-to-r from-blue-400 to-green-400 flex-1 rounded"></div>
              </div>
              <div className="text-white font-semibold text-sm">{routes[currentRoute].to}</div>
            </motion.div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
              <div>
                <span className="text-white/50">AI Match Score:</span>
                <div className="text-green-300 font-medium">95% Compatible</div>
              </div>
              <div>
                <span className="text-white/50">Estimated Cost:</span>
                <div className="text-cyan-300 font-medium">{routes[currentRoute].cost}</div>
              </div>
            </div>
          </div>

          {/* Requirements Grid */}
          <div className="grid grid-cols-2 gap-3">
            {requirements.map((req, index) => (
              <motion.div
                key={index}
                className="p-3 rounded-xl bg-white/5 border border-white/10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-white/80 text-xs font-medium">{req.type}</div>
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: req.color }}
                  ></div>
                </div>
                <div 
                  className="text-xs font-semibold mt-1"
                  style={{ color: req.color }}
                >
                  {req.status}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobility Metrics */}
         <div className="relative px-6 pb-2">
           <div className="bg-slate-800/30 rounded-lg p-2 border border-white/10">
             <div className="flex items-center justify-between mb-1">
               <span className="text-white/80 text-xs font-medium">Visa Approval Rates</span>
               <span className="bg-cyan-500/20 text-cyan-300 px-1 py-0.5 rounded text-xs">Live</span>
             </div>
             
             <div className="space-y-1">
               {mobilityTrends.map((metric, i) => (
                 <motion.div
                   key={i}
                   className="flex items-center gap-1.5"
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ duration: 0.5, delay: 1.5 + i * 0.1 }}
                 >
                   <div className="w-20 text-xs text-white/70 font-medium truncate">{metric.label}</div>
                   <div className="flex-1 bg-slate-700/50 rounded-full h-1 overflow-hidden">
                     <motion.div
                       className={`h-full ${metric.color} rounded-full`}
                       initial={{ width: 0 }}
                       animate={{ width: `${metric.value}%` }}
                       transition={{ duration: 1.5, delay: 2 + i * 0.2, ease: "easeOut" }}
                     />
                   </div>
                   <div className="text-xs text-white/60 w-7">{metric.value}%</div>
                   <div className="text-xs text-green-400 w-8">{metric.trend}</div>
                 </motion.div>
               ))}
             </div>
           </div>
         </div>

        {/* AI Insights Status */}
        <div className="relative z-10 px-6 pb-4">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white/60">Visa Intelligence</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-white/60">Cost Analysis</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="text-white/60">AI Matching</span>
              </div>
            </div>
            <div className="text-white/60 flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
              AI Processing: Live
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

MobilityDashboard.displayName = 'MobilityDashboard';

// Main Mobility Hero Section Component
const MobilityHeroSection = memo(() => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const navigate = useNavigate();

  return (
    <section 
      ref={sectionRef}
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
    >
      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
        {/* Development Banner */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm border border-purple-400/30 rounded-full px-6 py-3">
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
            <span className="text-purple-300 font-medium text-sm">
              🚧 Currently in Development - Join our waitlist for early access
            </span>
          </div>
        </motion.div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Content */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-400/20 rounded-full px-4 py-2"
              >
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="text-purple-300 text-sm font-medium">Coming Soon</span>
              </motion.div>

              <motion.h1 
                className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-6 leading-tight"
                style={{ 
                  textShadow: '0 0 20px rgba(0, 170, 255, 0.5), 0 0 40px rgba(0, 170, 255, 0.3)',
                  willChange: 'transform, opacity'
                }}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={isInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
                transition={{ 
                  duration: 0.8, 
                  ease: "easeOut",
                  delay: 0.2,
                  scale: { type: "spring", stiffness: 300, damping: 30 }
                }}
              >
                Navigate Global Mobility with AI
              </motion.h1>
              
              <motion.h2 
                className="text-xl md:text-2xl text-white/80 font-light mb-6"
                style={{ textShadow: '0 0 15px rgba(0, 0, 0, 0.7)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400 font-semibold">WorldLore Mobility AI</span> — your intelligent AI agent for global travel, migration, and digital nomadism.
              </motion.h2>
              
              <motion.p 
                className="text-lg md:text-xl text-white/90 leading-relaxed font-light mb-8"
                style={{ textShadow: '0 0 15px rgba(0, 0, 0, 0.7)' }}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                Your AI agent will provide intelligent solutions for global and local mobility, including job opportunities, migration procedures, digital nomadism, and immigration requirements. Get personalized recommendations for living, working, or studying abroad based on your profile, with real-time data on visa requirements, cost of living, and local legislation.
              </motion.p>
            </div>

            {/* Feature Badges */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              <FeatureBadge icon="🌍" text="Travel Requirements Analysis (Soon)" delay={0.8} />
              <FeatureBadge icon="🥾" text="Trails.AI Routes (Soon)" delay={0.9} />
              <FeatureBadge icon="🎯" text="Personalized Recommendations (Soon)" delay={1.0} />
              <FeatureBadge icon="🤖" text="Personal AI Assistant (Soon)" delay={1.1} />
            </motion.div>

            {/* CTA Buttons */}
             <motion.div 
               className="flex flex-col sm:flex-row gap-4 justify-start"
               initial={{ opacity: 0, y: 20 }}
               animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
               transition={{ duration: 0.6, delay: 1.4 }}
             >
               <button
                 className="px-8 py-4 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 text-white font-medium text-lg rounded-full hover:shadow-[0_0_30px_rgba(34,197,94,0.7)] transition-all duration-300 transform hover:scale-105"
                 style={{
                   background: 'linear-gradient(45deg, #22c55e, #3b82f6, #8b5cf6)',
                   boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)'
                 }}
               >
                 Join Waitlist
               </button>
               
               <button
                 className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium text-lg rounded-full hover:shadow-[0_0_30px_rgba(139,92,246,0.7)] transition-all duration-300 transform hover:scale-105"
                 style={{
                   background: 'linear-gradient(45deg, #8b5cf6, #3b82f6)',
                   boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
                 }}
                 onClick={() => navigate('/landing/mobility-ai')}
               >
                 Explore Mobility AI
               </button>
             </motion.div>
          </motion.div>

          {/* Right Content - Dashboard */}
          <motion.div
            className="relative h-[600px] w-full"
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={isInView ? { opacity: 1, x: 0, scale: 1 } : {}}
            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
          >
            <MobilityDashboard />
          </motion.div>
        </div>
      </div>
    </section>
  );
});

MobilityHeroSection.displayName = 'MobilityHeroSection';

export default MobilityHeroSection;
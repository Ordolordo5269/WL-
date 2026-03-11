import { motion } from 'framer-motion';
interface Country {
  name: string;
  capital: string;
  region: string;
}
interface Props {
  country: Country | null;
}
export default function CountryCard({ country }: Props) {
  if (!country) return null;
  return (
    <motion.div className="p-4 bg-white dark:bg-gray-800 rounded shadow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-xl font-bold mb-2">{country.name}</h2>
      <p>Capital: {country.capital}</p>
      <p>Region: {country.region}</p>
    </motion.div>
  );
}

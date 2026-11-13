// Counters on /about and elsewhere: Magic UI Number Ticker (spring count-up when scrolled into view;
// the real number is in the server HTML).
import NumberTicker from "@/components/ui/NumberTicker";

const CountUp = ({ value, suffix = "" }: { value: number; suffix?: string; duration?: number }) => <NumberTicker value={value} suffix={suffix} />;

export default CountUp;

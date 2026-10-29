import { Button } from '../catalyst/button';
import { Heading } from '../catalyst/heading';
import { Text } from '../catalyst/text';

export function EmptyState({ onExample }: { onExample: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start py-10 sm:py-16">
      <p className="text-xs font-medium tracking-[0.16em] text-zinc-500 uppercase dark:text-zinc-400">
        System One
      </p>
      <Heading className="mt-3 text-3xl sm:text-4xl">Ask Jev about a piece of state.</Heading>
      <Text className="mt-3">
        Each turn is the content you want judged, plus any number of typed questions. Choice, Score,
        and Noul run together and come back as probabilities, not prose.
      </Text>
      <div className="mt-6 grid w-full gap-3 sm:grid-cols-3">
        <Hint
          title="Choice"
          body="One option from a list you define, with a probability for each."
        />
        <Hint
          title="Score"
          body="A position on ordered levels, plus how the probability is spread."
        />
        <Hint title="Noul" body="The probability that a yes/no question is true, from 0 to 1." />
      </div>
      <Button color="indigo" className="mt-6" onClick={onExample}>
        Load example
      </Button>
    </div>
  );
}

function Hint({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
      <p className="text-sm font-semibold text-zinc-950 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{body}</p>
    </div>
  );
}

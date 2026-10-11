import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Notice, Row, Screen, T } from '@/components/ui';
import { LESSONS } from '@/data/lessons';
import { useData } from '@/data/store';
import { useTheme } from '@/theme/settings';

export default function Fiche() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const { markLessonRead } = useData();
  const lesson = LESSONS.find((l) => l.id === id);
  const [answer, setAnswer] = useState<boolean | null>(null);

  if (!lesson) return <Screen>{null}</Screen>;
  const correct = answer !== null && answer === lesson.quiz.answer;

  const respond = (v: boolean) => {
    setAnswer(v);
    markLessonRead(lesson.id);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: lesson.title }} />
      <T v="title">{lesson.title}</T>
      {lesson.paragraphs.map((p, i) => (
        <T key={i} style={{ lineHeight: 26 }}>
          {p}
        </T>
      ))}
      <Card tone="primary">
        <T v="bodyBold">Vrai ou faux ?</T>
        <T>{lesson.quiz.question}</T>
        <Row>
          <Button style={{ flex: 1 }} variant={answer === true ? 'primary' : 'secondary'} label="Vrai" onPress={() => respond(true)} />
          <Button style={{ flex: 1 }} variant={answer === false ? 'primary' : 'secondary'} label="Faux" onPress={() => respond(false)} />
        </Row>
        {answer !== null ? (
          <Notice tone={correct ? 'success' : 'warning'} icon={correct ? 'checkmark-circle-outline' : 'bulb-outline'}>
            {correct ? 'Bonne réponse ! ' : `Réponse : ${lesson.quiz.answer ? 'vrai' : 'faux'}. `}
            {lesson.quiz.explanation}
          </Notice>
        ) : null}
      </Card>
      {answer !== null ? <Button label="Fiches suivantes" icon="arrow-back" variant="ghost" onPress={() => router.back()} /> : null}
      <T v="caption" muted center style={{ color: c.textMuted }}>
        GlycoLife aide au suivi, il ne remplace pas votre médecin.
      </T>
    </Screen>
  );
}

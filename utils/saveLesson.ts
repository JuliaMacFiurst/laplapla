export async function saveLessonToDB(word: string, steps: any[], author = 'ai_generated') {
  try {
    const response = await fetch('/api/lesson/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ word, steps, author }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Ошибка при сохранении урока');
    }

    return data; // { message: 'Lesson saved', id: ... }
  } catch (error) {
    console.error('Ошибка при сохранении урока:', error);
    throw error;
  }
}

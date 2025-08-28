import { DictionaryStats, DictionaryTag } from '../types';

describe('Types', () => {
  it('should allow creating DictionaryStats objects', () => {
    const stats: DictionaryStats = {
      kind: 'noun',
      count: 1500
    };
    
    expect(stats.kind).toBe('noun');
    expect(stats.count).toBe(1500);
  });

  it('should allow creating DictionaryTag objects', () => {
    const tag: DictionaryTag = {
      kind: 'noun',
      tag: 'animal',
      description: 'Animals and creatures',
      opt_in: true,
      word_count: 250
    };
    
    expect(tag.kind).toBe('noun');
    expect(tag.tag).toBe('animal');
    expect(tag.description).toBe('Animals and creatures');
    expect(tag.opt_in).toBe(true);
    expect(tag.word_count).toBe(250);
  });

  it('should allow arrays of these types', () => {
    const statsArray: DictionaryStats[] = [
      { kind: 'noun', count: 1000 },
      { kind: 'adjective', count: 500 },
      { kind: 'verb', count: 300 }
    ];
    
    expect(statsArray).toHaveLength(3);
    expect(statsArray[0].kind).toBe('noun');
    expect(statsArray[1].count).toBe(500);
    
    const tagsArray: DictionaryTag[] = [
      { kind: 'noun', tag: 'formal', description: 'Formal language', opt_in: false, word_count: 100 },
      { kind: 'noun', tag: 'casual', description: 'Casual language', opt_in: true, word_count: 200 }
    ];
    
    expect(tagsArray).toHaveLength(2);
    expect(tagsArray[0].opt_in).toBe(false);
    expect(tagsArray[1].word_count).toBe(200);
  });
});

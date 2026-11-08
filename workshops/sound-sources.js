/* Provenance boundary. Current experience has no field recordings or sensor input.
   Future recorded sources require a licensed file, location, date, recorder,
   measurement method and explicit processing description before implementation. */
export const SOUND_SOURCES = Object.freeze({
 soil:Object.freeze({id:'soil-synthetic-01',kind:'synthesized',method:'seeded-noise-bandpass',recording:null,description:'粒が擦れるような想定合成音。土中の実測録音ではありません。'}),
 tree:Object.freeze({id:'tree-synthetic-01',kind:'synthesized',method:'descending-sine-pulse',recording:null,description:'樹の音を考えるための想定合成音。樹の実測録音ではありません。'})
});
export function sourceFor(kind){const source=SOUND_SOURCES[kind];if(!source||source.kind!=='synthesized')throw new Error('未検証の音源です');return source;}

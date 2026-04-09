const mainText = "This is a ## test\n## FAQ\nfoo bar";
const paragraphs = mainText.split('\n\n');
const firstHalf = paragraphs[0];
const secondHalf = paragraphs[1];

const linkDict = [
    { key: "express entry", url: "/search?q=Express+Entry" },
    { key: "rcic", url: "/search" },
    { key: "licensed consultant", url: "/search" }
  ];
  
let f = firstHalf;
let s = secondHalf || "";

  linkDict.forEach(link => {
    const regex = new RegExp(`(?<!\\[)(?<!\\()\\b(${link.key})\\b(?!\\])(?!\\))`, 'gi');
    f = f.replace(regex, `[$1](${link.url})`);
    s = s.replace(regex, `[$1](${link.url})`);
  });
console.log(f, s);

import { execSync } from 'child_process';
try {
  execSync('bun run tsc --noEmit', {stdio: 'inherit'});
  print("TypeScript check passed");
} catch (e) {
  print("TypeScript check failed");
}

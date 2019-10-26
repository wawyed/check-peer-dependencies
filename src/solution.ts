import { createECDH } from 'crypto';
import * as semver from 'semver';
import { exec } from 'shelljs';
import { Dependency } from './packageUtils';

function semverReverseSort(a, b) {
  const lt = semver.lt(a, b);
  const gt = semver.gt(a, b);
  if (!lt && !gt) {
    return 0;
  } else if (lt) {
    return 1;
  }
  return -1;
}

interface Resolution {
  problem: Dependency;
  resolution: string;
  resolutionType: 'upgrade' | 'install';
}

export function findPossibleResolutions(problems: Dependency[], allPeerDependencies: Dependency[]): Resolution[] {
  const uniq: Dependency[] = problems.reduce((acc, problem) => acc.some(dep => dep.name === problem.name) ? acc : acc.concat(problem), []);
  return uniq.map(problem => {
    const resolutionType = problem.installedVersion ? 'upgrade' : 'install';
    const resolutionVersion = findPossibleResolution(problem.name, allPeerDependencies);
    const resolution = resolutionVersion ? `${problem.name}@${resolutionVersion}` : null;

    return { problem, resolution, resolutionType } as Resolution;
  })
}

function findPossibleResolution(packageName, allPeerDeps) {
  const requiredPeerVersions = allPeerDeps.filter(dep => dep.name === packageName);
  const command = `npm view ${packageName} versions`;
  let rawVersionsInfo;
  try {
    rawVersionsInfo = exec(command, { silent: true }).stdout;
    const availableVersions = JSON.parse(rawVersionsInfo.replace(/'/g, '"')).sort(semverReverseSort);
    return availableVersions.find(ver => requiredPeerVersions.every(peerVer => semver.satisfies(ver, peerVer.version)));
  } catch (err) {
    console.error(`Error while running command: '${command}'`);
    console.error(err);
    console.error();
    console.error('npm output:');
    console.error(rawVersionsInfo);
  }
}

import type { Reaction } from '../types';

/** GraphQL selection for reaction data on Issues/PRs (uses reactionGroups to stay cheap). */
export const REACTION_FIELDS = `
  reactions {
    totalCount
  }
  reactionGroups {
    content
    users {
      totalCount
    }
  }
`;

interface ReactionGroup {
  content: string;
  users: { totalCount: number };
}

export interface RawReactionNode {
  reactions: { totalCount: number };
  reactionGroups: ReactionGroup[] | null;
}

export function calculateReactionCounts(node: RawReactionNode): Reaction {
  let positiveCount = 0;
  let negativeCount = 0;

  for (const group of node.reactionGroups || []) {
    const count = group.users.totalCount;
    switch (group.content) {
      case 'THUMBS_UP':
      case 'HEART':
      case 'HOORAY':
      case 'ROCKET':
      case 'EYES':
      case 'LAUGH':
        positiveCount += count;
        break;
      case 'THUMBS_DOWN':
      case 'CONFUSED':
        negativeCount += count;
        break;
    }
  }

  return {
    totalCount: node.reactions.totalCount,
    positiveCount,
    negativeCount,
  };
}

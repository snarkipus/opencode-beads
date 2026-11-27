function isAssertion(node) {
  return node?.type === "TSAsExpression" || node?.type === "TSTypeAssertion";
}

export default {
  meta: { name: "oc-beads" },
  rules: {
    "no-chained-type-assertions": {
      meta: {
        type: "problem",
        schema: [],
        messages: {
          chained:
            "Avoid chained type assertions. Preserve the original type or validate untrusted input before narrowing it.",
        },
      },
      create(context) {
        function check(node) {
          let inner = node.expression;
          while (inner.type === "ParenthesizedExpression") inner = inner.expression;
          if (isAssertion(inner)) context.report({ node, messageId: "chained" });
        }
        return { TSAsExpression: check, TSTypeAssertion: check };
      },
    },
  },
};

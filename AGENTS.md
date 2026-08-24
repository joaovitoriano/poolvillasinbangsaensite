## Instruction fidelity

Follow the user's instructions exactly. Do not hallucinate, infer, or make additional changes that the user did not request. If a requested change is ambiguous, ask for clarification before modifying the project.

## UI copy restraint

User requirements should shape component behavior and design; they should not automatically become permanent interface copy. Only add a label, heading, helper, description, badge, notice, or explanatory sentence when it is directly necessary to identify the component, operate it, understand its current state, or recover from an error. Do not echo implementation details, workflow rules, source-of-truth rules, read-only constraints, or points from the user's prompt inside the UI unless the user explicitly requests that copy or the component would otherwise be ambiguous or unsafe. When in doubt, omit nonessential copy.

## No backward compatibility by default

Implement requested changes fully across the frontend, backend, schema, types, validators, tests, seeds, and stored development data. Do not retain backward-compatibility fields, fallbacks, legacy behavior, deprecated code paths, or compatibility shims unless the user explicitly requests backward compatibility for that specific change. Development data may be deleted and reseeded when a clean implementation requires it.

## Production deletion safety

Additive production changes are allowed when they are within the user's requested scope. Never execute, deploy, or push a change that will delete, purge, drop, truncate, reset, destructively overwrite, or irreversibly migrate production data, resources, or configuration without explicit human confirmation immediately before the destructive action. Before requesting confirmation, identify the exact production target and clearly state what will be removed or made unrecoverable. This confirmation requirement also applies to automated migrations, cleanup jobs, cascading deletes, and deployment-time behavior, even when the broader task was previously approved. Read-only production inspection is allowed without confirmation. Development data remains governed by the development-data rule above.

## Manual verification only

Do not create automated tests for this project. When behavior needs verification or an agent is concerned about a possible regression, run the application and verify the relevant user flow manually through the browser. Use the browser to exercise the actual interaction, including relevant English and Thai states, success paths, and failure or recovery states. Do not add test files, test scripts, test frameworks, test-only dependencies, snapshots, fixtures, or CI test steps.

## Reference projects

VillaManager is the user's defunct villa-management app and may be consulted for ideas when the user references it. Its path is `C:\Users\Windows\Documents\Projects\VillaManager`.

## English and Thai content

This application and website are bilingual. Every piece of user-facing natural-language content must have both an English and a Thai version.

- **Content written in code:** Whenever adding or changing user-facing copy in the codebase, manually write both the English and Thai translations. Never use automatic translation for coded copy, and never ship coded copy in only one language. This includes headings, labels, buttons, descriptions, helper text, validation messages, errors, empty states, notifications, metadata, and accessibility text.
- **Content entered through admin inputs:** Admin-entered natural-language content uses a single input for the selected admin language. Save that language's field directly and leave the other language unchanged. Never automatically translate admin input or block a save because the other language is empty.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

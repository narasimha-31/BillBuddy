<script lang="ts">
	let { data } = $props();
</script>

<h1>BillBuddy</h1>

{#if data.email}
	<p>Signed in as {data.email}</p>
	<form method="POST" action="?/signout">
		<button>Sign out</button>
	</form>
{:else}
	{#if data.signInFailed}
		<p>Sign-in didn't go through. Try again.</p>
	{/if}
	<form method="POST" action="?/google">
		<button>Continue with Google</button>
	</form>
{/if}
